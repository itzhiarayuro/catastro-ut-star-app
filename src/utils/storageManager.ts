/* ═══════════════════════════════════════════════════════════
   STORAGE MANAGER - UT STAR (IndexedDB & Quota Management)
   ═══════════════════════════════════════════════════════════ */

const DB_NAME = 'UT_STAR_STORAGE';
const DB_VERSION = 1;
const PHOTO_STORE = 'fotos_pendientes';

export interface PendingPhoto {
    id: string; // ID único para el store
    pozoId: string;
    municipio: string;
    barrio: string;
    filename: string;
    blob: string; // Base64 o Blob
    categoria: 'General' | 'Interior' | 'Daños' | 'Tuberia' | 'Medicion';
    inspector: string;
    timestamp: number;
    synced: boolean;
}

/**
 * Inicializa la base de datos IndexedDB
 */
export async function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(PHOTO_STORE)) {
                db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Guarda una foto en IndexedDB
 */
export async function savePhotoToStorage(photo: PendingPhoto): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);
    return new Promise((resolve, reject) => {
        const request = store.put(photo);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene todas las fotos pendientes de sincronizar
 */
export async function getPendingPhotos(): Promise<PendingPhoto[]> {
    const db = await initDB();
    const transaction = db.transaction(PHOTO_STORE, 'readonly');
    const store = transaction.objectStore(PHOTO_STORE);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Elimina una foto del almacenamiento después de sincronizar
 */
export async function deletePhotoFromStorage(id: string): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Verifica el espacio disponible en disco (Quota Management)
 * Retorna true si queda más del margen especificado (MB)
 */
export async function checkStorageSpace(minMB: number = 500): Promise<{ hasSpace: boolean, availableMB: number }> {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        // estimate.quota: bytes totales asignados
        // estimate.usage: bytes usados actualmente
        const availableBytes = (estimate.quota || 0) - (estimate.usage || 0);
        const availableMB = availableBytes / (1024 * 1024);

        return {
            hasSpace: availableMB > minMB,
            availableMB: Math.round(availableMB)
        };
    }
    // Fallback si no está disponible la API
    return { hasSpace: true, availableMB: 9999 };
}

/**
 * Determina si debe usar el Modo Texto basado en el espacio y cantidad de fotos
 */
export async function getHybridModeStatus(photoCount: number): Promise<{ mode: 'LOCKED' | 'FULL' | 'HYBRID', info: string }> {
    const { hasSpace, availableMB } = await checkStorageSpace(500);

    if (!hasSpace) {
        return {
            mode: 'LOCKED',
            info: `Espacio crítico: ${availableMB}MB. Solo modo texto habilitado.`
        };
    }

    if (photoCount > 50) {
        return {
            mode: 'HYBRID',
            info: `Cola saturada (>50 fotos). Usa la Web App para PC para descargar la SD y liberar espacio.`
        };
    }

    return {
        mode: 'FULL',
        info: `Espacio OK (${availableMB}MB). Captura directa habilitada.`
    };
}

/**
 * Actualiza el pozoId y filename de una foto específica en IndexedDB
 */
export async function renamePhotoInStorage(id: string, newPozoId: string, newFilename: string): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const photo = getRequest.result as PendingPhoto;
            if (photo) {
                photo.pozoId = newPozoId;
                photo.filename = newFilename;
                store.put(photo).onsuccess = () => resolve();
            } else {
                resolve();
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * Actualiza el estado de sincronización de una foto
 */
export async function updatePhotoSyncStatus(id: string, synced: boolean): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const photo = getRequest.result;
            if (photo) {
                photo.synced = synced;
                // If synced, we can either keep it as 'synced: true' or delete it.
                // The user requested "Zero data loss", so maybe keeping it for a while is good.
                // But for space, we should probably delete it after sync success.
                if (synced) {
                    store.delete(id).onsuccess = () => resolve();
                } else {
                    store.put(photo).onsuccess = () => resolve();
                }
            } else {
                resolve();
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * Cuenta cuántas fotos hay pendientes
 */
export async function getPendingPhotosCount(): Promise<number> {
    const db = await initDB();
    const transaction = db.transaction(PHOTO_STORE, 'readonly');
    const store = transaction.objectStore(PHOTO_STORE);
    return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Verifica cuáles IDs de una lista están presentes en el almacén de pendientes
 */
export async function checkPendingInList(ids: string[]): Promise<string[]> {
    const db = await initDB();
    const transaction = db.transaction(PHOTO_STORE, 'readonly');
    const store = transaction.objectStore(PHOTO_STORE);

    const results: string[] = [];
    const promises = ids.map(id => {
        return new Promise<void>((resolve) => {
            const req = store.get(id);
            req.onsuccess = () => {
                if (req.result) results.push(id);
                resolve();
            };
            req.onerror = () => resolve();
        });
    });

    await Promise.all(promises);
    return results;
}
