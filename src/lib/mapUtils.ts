
const DB_NAME = 'UT_STAR_OFFLINE_MAPS';
const STORE_NAME = 'tiles';

export async function initOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getTile(key: string): Promise<Blob | null> {
    try {
        const db = await initOfflineDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        console.error("Error accessing IndexedDB for tiles:", e);
        return null;
    }
}

export async function saveTile(key: string, blob: Blob): Promise<void> {
    const db = await initOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}
