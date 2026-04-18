import { db, useAuth } from '../lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { AppState } from '../types/catastro';
import { fetchPhotoFromDrive } from '../utils/driveSync';
import { savePhotoToStorage } from '../utils/storageManager';
import { useAppStore } from './useAppStore';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/ui';

/* ── Helper para normalizar texto (quitar tildes y pasar a mayúsculas) ── */
const normalizeText = (text: string) => 
    text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : "";

interface UseCloudRestoreParams {
    toast: (msg: string) => void;
    safeSaveAllFichas: (fichas: Record<string, AppState>) => Promise<void>;
}

export const useCloudRestore = ({ toast, safeSaveAllFichas }: UseCloudRestoreParams) => {
    const { setPendingMarcaciones } = useAppStore();
    const { user } = useAuth();

    const restoreFromCloud = async () => {
        if (!navigator.onLine) {
            toast("❌ Necesitas conexión para restaurar");
            return;
        }
        if (!confirm("⚠️ Esto sobrescribirá tus fichas locales con las descargas de la nube (Investigación). ¿Continuar?")) return;

        toast("🔄 Descargando desde la nube...");
        try {
            // Fichas: Fetch ONLY for current user
            if (!user?.uid) throw new Error("No user UID found");
            const q = query(collection(db, 'fichas'), where('createdBy', '==', user.uid)); 
            const snapshot = await getDocs(q);
            const currentFichas = useAppStore.getState().fichas;
            const updatedFichas: Record<string, AppState> = { ...currentFichas };
            const downloadedFichas: AppState[] = [];
            let countRestored = 0;

            snapshot.forEach(docSnap => {
                const data = docSnap.data() as AppState;
                if (!data || data.deleted) return;

                // Use Firestore document ID as the canonical identifier
                const firestoreDocId = docSnap.id;
                // Prefer the internal id if present, otherwise use Firestore doc ID
                const finalId = data.id || firestoreDocId;

                // Simple ID-based dedup: if this ficha already exists locally by the same ID,
                // the cloud version takes precedence (it's the synced version).
                // If there's a matching Firestore doc ID that differs from the internal id,
                // also map via the Firestore doc ID to prevent duplicates from old naming.
                const fichaFinal = { ...data, id: finalId, synced: true };
                updatedFichas[finalId] = fichaFinal;
                downloadedFichas.push(fichaFinal);
                countRestored++;
            });

            if (countRestored === 0) {
                toast("ℹ️ No se encontraron fichas en la nube");
                return;
            }
            await safeSaveAllFichas(updatedFichas);
            toast(`✅ Restauradas/Sincronizadas ${countRestored} fichas`);

            // Hidratar fotos en segundo plano solo de las descargadas
            downloadedFichas.forEach(async (ficha) => {
                if (ficha.fotoList && Array.isArray(ficha.fotoList)) {
                    for (const foto of ficha.fotoList) {
                        if (foto.id && foto.filename) {
                             const blob = await fetchPhotoFromDrive(foto.filename);
                             if (blob) {
                                 await savePhotoToStorage({
                                     id: foto.id,
                                     pozoId: ficha.pozo || '',
                                     municipio: ficha.municipio || '',
                                     barrio: ficha.barrio || '',
                                     filename: foto.filename,
                                     blob: blob,
                                     categoria: foto.categoria || 'General',
                                     inspector: ficha.elaboro || 'Sistema',
                                     timestamp: Date.now(),
                                     synced: true
                                 }).catch(() => {});
                             }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error restoring from cloud", error);
            toast("❌ Error al restaurar desde la nube");
        }
    };

    const restoreMarcacionesFromCloud = async () => {
        if (!navigator.onLine) {
            toast("❌ Necesitas conexión para restaurar");
            return;
        }
        if (!confirm("⚠️ Esto descargará las marcaciones globales de la nube. ¿Continuar?")) return;

        toast("🔄 Descargando marcaciones...");
        try {
            // Marcaciones: Fetch ONLY for current user
            if (!user?.uid) throw new Error("No user UID found");

            const q = query(collection(db, 'marcaciones'), where('createdBy', '==', user.uid));
            const snapshot = await getDocs(q);
            const recovered: any[] = [];

            // Cargar existentes para no duplicar por createdAt
            const existing: any[] = safeLocalStorageGet('marcaciones_star', []);
            const existingIds = new Set(existing.map(m => m.createdAt));

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (!data) return;
                
                if (!existingIds.has(data.createdAt)) {
                    recovered.push({ ...data, id: docSnap.id, synced: true });
                }
            });

            if (recovered.length === 0) {
                toast("ℹ️ No se encontraron marcaciones nuevas en la nube");
                return;
            }

            const updated = [...existing, ...recovered];
            safeLocalStorageSet('marcaciones_star', JSON.stringify(updated));
            setPendingMarcaciones(updated.filter(m => !m.synced && !m.deleted).length);

            toast(`✅ Recuperadas ${recovered.length} marcaciones propias`);

            // Hidratar fotos de marcaciones en segundo plano
            recovered.forEach(async (m) => {
                if (m.fotos && typeof m.fotos === 'object') {
                    for (const key of Object.keys(m.fotos)) {
                        const f = m.fotos[key];
                        if (f && f.id && f.filename) {
                            const blob = await fetchPhotoFromDrive(f.filename);
                            if (blob) {
                                await savePhotoToStorage({
                                    id: f.id,
                                    pozoId: m.pozoId || '',
                                    municipio: m.municipio || '',
                                    barrio: m.barrio || '',
                                    filename: f.filename,
                                    blob: blob,
                                    categoria: key,
                                    inspector: m.inspector || 'Sistema',
                                    timestamp: m.createdAt || Date.now(),
                                    synced: true
                                }).catch(() => {});
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error restoring marcaciones", error);
            toast("❌ Error al recuperar marcaciones");
        }
    };

    const repairMarcacionesSync = () => {
        if (!confirm("⚠️ Esto marcará todas tus marcaciones locales como 'Pendientes' para que se vuelvan a subir a Firebase. ¿Quieres continuar?")) return;

        try {
            const existing: any[] = safeLocalStorageGet('marcaciones_star', []);
            const updated = existing.map(m => ({ ...m, synced: false }));
            safeLocalStorageSet('marcaciones_star', JSON.stringify(updated));
            setPendingMarcaciones(updated.filter(m => !m.deleted).length);
            toast("🔄 Marcaciones listas para re-sincronizar");
        } catch (e) {
            toast("❌ Error al reparar sync");
        }
    };

    return { restoreFromCloud, restoreMarcacionesFromCloud, repairMarcacionesSync };
};
