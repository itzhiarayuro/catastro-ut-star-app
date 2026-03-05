import { db, persistFicha } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface AppState {
    id: string | null;
    pozo: string;
    municipio: string;
    synced: boolean;
    [key: string]: any;
}

export const validateFicha = (f: any): boolean => {
    // Paso 1
    const step1 = f.pozo && f.barrio && f.direccion && f.municipio && f.sistema && f.gps?.lat && f.gps?.lng;
    // Paso 2
    const step2 = f.camara && f.rasante && f.diam > 0 && f.altura > 0;

    // Evitar valores literales "OTRO" sin contenido real (ya manejado por el formulario, pero doble check)
    const isOtroCamara = f.camara === 'OTRO';
    const isOtroRasante = f.rasante === 'OTRO';

    return !!(step1 && step2 && !isOtroCamara && !isOtroRasante);
};

export const syncFichasToFirestore = async (
    fichas: Record<string, any>,
    onProgress?: (progress: { total: number; current: number; msg: string }) => void
): Promise<Record<string, any>> => {
    // Solo fichas NO sincronizadas que CUMPLAN la validación
    const fichasArr = Object.values(fichas).filter(f => !f.synced && validateFicha(f));
    const total = fichasArr.length;
    let current = 0;

    const updatedFichas = { ...fichas };

    for (const ficha of fichasArr) {
        current++;
        if (onProgress) {
            onProgress({ total, current: current, msg: `Subiendo ${ficha.pozo}...` });
        }

        try {
            // Marcar como sincronizado antes de subir
            const finalData = { ...ficha, synced: true };

            // Usamos el persistFicha que maneja master + historial automáticamente
            await persistFicha(finalData);

            updatedFichas[ficha.id!] = finalData;
        } catch (err) {
            console.error(`Error sincronizando ficha ${ficha.pozo}:`, err);
            // No marcamos como sincronizado si falla
        }
    }

    return updatedFichas;
};

export const syncMarcacionesToFirestore = async (
    onProgress?: (progress: { total: number; current: number; msg: string }) => void
): Promise<void> => {
    const existing: any[] = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
    const pending = existing.filter(m => !m.synced && !m.deleted);
    const total = pending.length;
    let current = 0;

    for (const Marc of pending) {
        current++;
        if (onProgress) {
            onProgress({ total, current, msg: `Sincronizando Marcación ${Marc.codigo}...` });
        }

        try {
            const path = `marcaciones/${Marc.municipio.toUpperCase()}_${Marc.codigo}`;
            await setDoc(doc(db, path), { ...Marc, synced: true, lastSync: new Date().toISOString() });

            // Actualizar en localStorage
            const updated = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
            const idx = updated.findIndex((m: any) => m.codigo === Marc.codigo && m.municipio === Marc.municipio);
            if (idx >= 0) {
                updated[idx].synced = true;
                localStorage.setItem('marcaciones_star', JSON.stringify(updated));
            }
        } catch (err) {
            console.error(`Error sincronizando marcación ${Marc.codigo}:`, err);
        }
    }
};
