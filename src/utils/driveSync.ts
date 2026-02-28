import { getPendingPhotos, updatePhotoSyncStatus } from './storageManager';
import { zipSync, strToU8 } from 'fflate';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyrNgrDzmJwFLqG6c2vpN8Pj0F0VU0fOcdttSexcNJbelcJUDF4WnPAN7jd09_iHjre/exec'; // User must replace this
const SECRET_TOKEN = 'STAR-2025-VIP-SYNC';
const MAX_BATCH_SIZE = 35 * 1024 * 1024; // ~35MB to stay safe within 40MB limit

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

    // Group photos into batches
    let currentBatch: any[] = [];
    let currentBatchSize = 0;

    for (const photo of pending) {
        // Simple base64 length estimate
        const estimatedSize = photo.blob.length * 0.75;

        if (currentBatchSize + estimatedSize > MAX_BATCH_SIZE && currentBatch.length > 0) {
            await uploadBatch(currentBatch, onProgress, progress);
            currentBatch = [];
            currentBatchSize = 0;
        }

        currentBatch.push(photo);
        currentBatchSize += estimatedSize;
    }

    if (currentBatch.length > 0) {
        await uploadBatch(currentBatch, onProgress, progress);
    }
};

const uploadBatch = async (batch: any[], onProgress: (p: SyncProgress) => void, progress: SyncProgress) => {
    const zipData: Record<string, Uint8Array> = {};

    for (const photo of batch) {
        progress.currentFile = photo.filename;
        onProgress({ ...progress });

        // Convert dataURL to Uint8Array
        const base64 = photo.blob.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        zipData[photo.filename] = bytes;
    }

    const zipped = zipSync(zipData);

    // Chunking to avoid "Maximum call stack size exceeded" on large zips
    const CHUNK_SZ = 0x8000;
    const charChunks: string[] = [];
    for (let i = 0; i < zipped.length; i += CHUNK_SZ) {
        charChunks.push(String.fromCharCode.apply(null, zipped.subarray(i, i + CHUNK_SZ) as any));
    }
    const zipBase64 = btoa(charChunks.join(''));

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for GAS unless CORS is handled specifically
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: SECRET_TOKEN,
                zipData: zipBase64,
                metadata: batch.map(p => ({
                    id: p.id,
                    filename: p.filename,
                    municipio: p.municipio || 'SOPÓ',
                    pozoId: p.pozoId || 'S/N',
                    barrio: p.barrio || 'CATASTRO',
                    categoria: p.categoria || 'General',
                    inspector: p.inspector || 'Inspector'
                }))
            })
        });

        // Since we use 'no-cors', we can't read the response body, 
        // but we assume success if no exception is thrown.
        // For a more robust solution, 'cors' mode in GAS is better but harder to set up.

        for (const photo of batch) {
            await updatePhotoSyncStatus(photo.id, true);
            progress.synced++;
        }
        onProgress({ ...progress });

    } catch (err: any) {
        console.error("Batch upload error", err);
        progress.error = err.message;
        onProgress({ ...progress });
        throw err;
    }
};
