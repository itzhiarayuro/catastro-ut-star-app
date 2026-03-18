import { db, useAuth } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { AppState } from '../types/catastro';
import { fetchPhotoFromDrive } from '../utils/driveSync';
import { savePhotoToStorage } from '../utils/storageManager';
import { useAppStore } from './useAppStore';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/ui';

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
        if (!confirm("⚠️ Esto sobrescribirá tus fichas locales con las descargas de la nube. ¿Continuar?")) return;

        toast("🔄 Descargando desde la nube...");
        try {
            const operatorEmail = user?.email;
            if (!operatorEmail) {
                toast("❌ No se encontró nombre de operario para buscar");
                return;
            }
            const q = query(collection(db, 'fichas'), where('creatorEmail', '==', operatorEmail));
            const snapshot = await getDocs(q);
            const recovered: Record<string, AppState> = {};
            snapshot.forEach(doc => {
                const data = doc.data() as AppState;
                recovered[doc.id] = { ...data, synced: true };
            });
            if (Object.keys(recovered).length === 0) {
                toast("ℹ️ No se encontraron fichas tuyas en la nube");
                return;
            }
            await safeSaveAllFichas(recovered);
            toast(`✅ Restauradas ${Object.keys(recovered).length} fichas asignadas a ti`);

            // Hidratar fotos en segundo plano
            Object.values(recovered).forEach(async (ficha) => {
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
        if (!confirm("⚠️ Esto descargará tus marcaciones (Pozos/Sumideros) de la nube. ¿Continuar?")) return;

        toast("🔄 Descargando marcaciones...");
        try {
            const operatorId = user?.name || user?.email;
            if (!operatorId) {
                toast("❌ No se pudo identificar al operario");
                return;
            }
            const q = query(collection(db, 'marcaciones'), where('inspector', '==', operatorId));
            const snapshot = await getDocs(q);
            const recovered: any[] = [];

            // Cargar existentes para no duplicar por createdAt
            const existing: any[] = safeLocalStorageGet('marcaciones_star', []);
            const existingIds = new Set(existing.map(m => m.createdAt));

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (!existingIds.has(data.createdAt)) {
                    recovered.push({ ...data, synced: true });
                }
            });

            if (recovered.length === 0) {
                toast("ℹ️ No se encontraron marcaciones nuevas en la nube");
                return;
            }

            const updated = [...existing, ...recovered];
            safeLocalStorageSet('marcaciones_star', JSON.stringify(updated));
            setPendingMarcaciones(updated.filter(m => !m.synced && !m.deleted).length);

            toast(`✅ Recuperadas ${recovered.length} marcaciones`);

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
