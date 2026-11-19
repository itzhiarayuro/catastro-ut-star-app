import { getPendingPhotos, updatePhotoSyncStatus, getAllFichasFromStorage, saveFichaToStorage } from './storageManager';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { uploadPendingPhotoWithFirebase } from './photoUploadTransport';

const GAS_URL = import.meta.env.VITE_GAS_DRIVE_SYNC_URL;
const SECRET_TOKEN = import.meta.env.VITE_GAS_SECRET_TOKEN;

interface SyncProgress {
    total: number;
    synced: number;
    currentFile: string;
    error: string | null;
}

export const syncPhotosToDrive = async (onProgress: (p: SyncProgress) => void) => {
    const pending = await getPendingPhotos();
    if (pending.length === 0) return;

    let progress: SyncProgress = {
        total: pending.length,
        synced: 0,
        currentFile: '',
        error: null
    };

    onProgress(progress);

    for (const photo of pending) {
        progress.currentFile = photo.filename;
        onProgress({ ...progress });

        // VALIDACIÓN: Rechazar pozoId vacío o inválido
        if (!photo.pozoId || photo.pozoId === 'SIN_ID' || photo.pozoId === 'MARC') {
            console.warn(`Sync omitado para ${photo.id}: pozoId invalido (${photo.pozoId})`);
            progress.synced++;
            await updatePhotoSyncStatus(photo.id, true); // Lo marcamos como "procesado" para que no moleste
            onProgress({ ...progress });
            continue;
        }

        try {
            await uploadSinglePhoto(photo);
            progress.synced++;
            onProgress({ ...progress });
        } catch (err: any) {
            console.error(`Error sincronizando ${photo.filename}:`, err);
            progress.error = `Error en ${photo.filename}: ${err.message}`;
            onProgress({ ...progress });
            // Continuamos con la siguiente foto
        }
    }
};

const uploadSinglePhoto = async (photo: any) => {
    const invoke = httpsCallable(functions, 'uploadPendingPhoto');
    const result = await uploadPendingPhotoWithFirebase(invoke as any, photo);

    const fichas = await getAllFichasFromStorage();
    for (const ficha of Object.values(fichas)) {
        const index = ficha.fotoList?.findIndex((item: any) => item.id === photo.id || item.filename === photo.filename) ?? -1;
        if (index < 0) continue;
        const fotoList = [...ficha.fotoList];
        fotoList[index] = { ...fotoList[index], driveId: result.driveId, syncedAt: new Date().toISOString() };
        await saveFichaToStorage({ ...ficha, fotoList });
    }

    await updatePhotoSyncStatus(photo.id, true);
    return result;
};

/**
 * Descarga una foto desde Google Drive usando el Proxy de GAS.
 * El parámetro `municipio` es OBLIGATORIO: cada llamada debe pasar
 * el municipio correcto del registro al que pertenece la foto.
 * No hay fallback global — si llega vacío se aborta y se loguea.
 */
export const fetchPhotoFromDrive = async (filename: string, municipio: string): Promise<string | null> => {
    if (!GAS_URL) {
        console.error("DRIVE_SYNC_URL no configurada");
        return null;
    }
    if (!municipio || !municipio.trim()) {
        console.warn(`[fetchPhotoFromDrive] Llamada sin municipio para ${filename} — se aborta para evitar buscar en carpeta incorrecta.`);
        return null;
    }

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
                token: SECRET_TOKEN,
                action: 'download',
                filename: filename,
                municipio: municipio,
                pozoId: filename.split('-')[0]
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success && result.base64) {
            return result.base64;
        } else {
            console.warn(`Error descargando ${filename}:`, result.error || 'Unknown error');
            return null;
        }
    } catch (err) {
        console.error(`Fallo fetch de Drive para ${filename}:`, err);
        return null;
    }
};

