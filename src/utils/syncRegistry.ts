import { db, persistFicha } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface AppState {
    id: string | null;
    pozo: string;
    municipio: string;
    synced: boolean;
    [key: string]: any;
}

export const syncFichasToFirestore = async (
    fichas: Record<string, any>,
    onProgress?: (progress: { total: number; current: number; msg: string }) => void
): Promise<Record<string, any>> => {
    const fichasArr = Object.values(fichas).filter(f => !f.synced && f.pozo && f.municipio);
    const total = fichasArr.length;
    let current = 0;

    const updatedFichas = { ...fichas };

    for (const ficha of fichasArr) {
        current++;
        if (onProgress) {
            onProgress({ total, current, msg: `Subiendo ${ficha.pozo}...` });
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
