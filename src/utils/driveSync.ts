import { getPendingPhotos, updatePhotoSyncStatus } from './storageManager';
import { zipSync, strToU8 } from 'fflate';

const GAS_URL = import.meta.env.VITE_GAS_DRIVE_SYNC_URL;
const SECRET_TOKEN = import.meta.env.VITE_GAS_SECRET_TOKEN;
const MAX_BATCH_SIZE = 12 * 1024 * 1024; // Lower batch size (12MB) for better stability in GAS / Mobile uploads

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
    if (!GAS_URL) throw new Error("GAS_URL no configurada");

    const payload = {
        token: SECRET_TOKEN,
        municipio: photo.municipio || 'SOPÓ',
        pozoId: photo.pozoId,
        barrio: photo.barrio || 'CATASTRO',
        filename: photo.filename,
        base64: photo.blob,
        md5: photo.md5,
        categoria: photo.categoria || 'General',
        inspector: photo.inspector || 'Inspector'
    };

    const response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors', // Cambiamos a cors para poder leer la respuesta JSON si es posible
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || "Error desconocido en el servidor");
    }

    // Si tuvo éxito (ya sea subiendo o porque era duplicado), marcamos como sincronizada
    await updatePhotoSyncStatus(photo.id, true);
    return result;
};

/**
 * Descarga una foto desde Google Drive usando el Proxy de GAS
 */
export const fetchPhotoFromDrive = async (filename: string): Promise<string | null> => {
    if (!GAS_URL) {
        console.error("DRIVE_SYNC_URL no configurada");
        return null;
    }

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            // Usamos mode: 'cors' pero evitamos el preflight manual enviando el body como string sin Content-Type JSON
            // GAS no maneja bien los preflight OPTIONS a menos que se configure explícitamente.
            mode: 'cors', 
            body: JSON.stringify({
                token: SECRET_TOKEN,
                action: 'download',
                filename: filename,
                municipio: (window as any).CURRENT_MUNICIPIO || localStorage.getItem('ut_star_municipio_cache')?.replace(/"/g, '') || '',
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

