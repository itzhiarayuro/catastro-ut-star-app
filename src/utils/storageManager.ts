/* ═══════════════════════════════════════════════════════════
   STORAGE MANAGER - UT STAR (IndexedDB & Quota Management)
   ═══════════════════════════════════════════════════════════ */

const DB_NAME = 'UT_STAR_STORAGE';
const DB_VERSION = 4;
const PHOTO_STORE = 'fotos_pendientes';
const FICHA_STORE = 'fichas_locales';

export interface PendingPhoto {
    id: string; // ID único para el store
    pozoId: string;
    municipio: string;
    barrio: string;
    filename: string;
    blob: string; // Base64 o Blob
    categoria: 'General' | 'Interior' | 'Daños' | 'Tuberia' | 'Medicion' | 'Sumidero' | any;
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
            console.log(`[IDB] Sincronizando esquema v${DB_VERSION}...`);
            if (!db.objectStoreNames.contains(PHOTO_STORE)) {
                db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
                console.log(`[IDB] Store creado: ${PHOTO_STORE}`);
            }
            if (!db.objectStoreNames.contains(FICHA_STORE)) {
                db.createObjectStore(FICHA_STORE, { keyPath: 'id' });
                console.log(`[IDB] Store creado: ${FICHA_STORE}`);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error("[IDB] Error abriendo DB:", request.error);
            reject(request.error);
        };
    });
}

/**
 * Helper para asegurar que la transacción sea segura (evita NotFoundError)
 */
async function getSafeTransaction(storeName: string, mode: IDBTransactionMode): Promise<{ transaction: IDBTransaction, store: IDBObjectStore }> {
    const db = await initDB();
    if (!db.objectStoreNames.contains(storeName)) {
        console.error(`[IDB] Error Crítico: Store '${storeName}' no existe en v${db.version}.`);
        throw new Error(`NotFoundError: El almacén de datos '${storeName}' no existe en la base de datos local. Por favor actualiza la aplicación (Ctrl+F5).`);
    }
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
}

/**
 * Guarda una ficha en IndexedDB
 */
export async function saveFichaToStorage(ficha: any): Promise<void> {
    try {
        const { store } = await getSafeTransaction(FICHA_STORE, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(ficha);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("[IDB] Fallo al guardar ficha:", e);
        // Fallback: No lanzamos error para no bloquear la app si IDB falla
        // pero avisamos en consola.
    }
}

/**
 * Obtiene todas las fichas desde IndexedDB
 */
export async function getAllFichasFromStorage(): Promise<Record<string, any>> {
    try {
        const { store } = await getSafeTransaction(FICHA_STORE, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const results: Record<string, any> = {};
                (request.result as any[]).forEach(f => {
                    if (f.id) results[f.id] = f;
                });
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("[IDB] Fallo al leer fichas:", e);
        return {};
    }
}

/**
 * Elimina una ficha de IndexedDB
 */
export async function deleteFichaFromStorage(id: string): Promise<void> {
    try {
        const { store } = await getSafeTransaction(FICHA_STORE, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) { }
}

/**
 * Guarda una foto en IndexedDB
 */
export async function savePhotoToStorage(photo: PendingPhoto): Promise<void> {
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(photo);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("[IDB] Fallo al guardar foto:", e);
    }
}

/**
 * Obtiene una foto específica por ID desde IndexedDB
 */
export async function getPhotoFromStorage(id: string): Promise<PendingPhoto | null> {
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return null;
    }
}

/**
 * Obtiene todas las fotos pendientes de sincronizar
 */
export async function getPendingPhotos(): Promise<PendingPhoto[]> {
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return [];
    }
}

/**
 * Elimina una foto del almacenamiento después de sincronizar
 */
export async function deletePhotoFromStorage(id: string): Promise<void> {
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) { }
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
    const { hasSpace, availableMB } = await checkStorageSpace(200);

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
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readwrite');

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
    } catch (e) { }
}

/**
 * Actualiza el estado de sincronización de una foto
 */
export async function updatePhotoSyncStatus(id: string, synced: boolean): Promise<void> {
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readwrite');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const photo = getRequest.result;
                if (photo) {
                    photo.synced = synced;
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
    } catch (e) { }
}

/**
 * Cuenta cuántas fotos hay pendientes
 */
export async function getPendingPhotosCount(): Promise<number> {
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return 0;
    }
}

/**
 * Verifica cuáles IDs de una lista están presentes en el almacén de pendientes
 */
export async function checkPendingInList(ids: string[]): Promise<string[]> {
    try {
        const { store } = await getSafeTransaction(PHOTO_STORE, 'readonly');

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
    } catch (e) {
        return [];
    }
}
