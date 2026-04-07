
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

export async function hydratePrebundledTiles(): Promise<void> {
    try {
        const hydrated = localStorage.getItem('prebundled_tiles_hydrated_v1.7.1');
        if (hydrated) return;

        console.log("Iniciando precarga de mapas de Sibaté...");
        const res = await fetch('/sibate-satellite.json');
        if (!res.ok) {
            console.warn("No se encontró el archivo de mapas pre-cargados.");
            return;
        }
        
        const data = await res.json();
        const db = await initOfflineDB();
        
        const dataURLtoBlob = (dataurl: string) => {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        };

        const keys = Object.keys(data);
        const BATCH_SIZE = 200;
        
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const batch = keys.slice(i, i + BATCH_SIZE);
            
            for (const key of batch) {
                const blob = dataURLtoBlob(data[key]);
                store.put(blob, key);
            }
            
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
            console.log(`Precargando mapas... ${Math.min(i + BATCH_SIZE, keys.length)} / ${keys.length}`);
        }
        
        localStorage.setItem('prebundled_tiles_hydrated_v1.7.1', 'true');
        console.log("¡Precarga de mapas completada con éxito!");
    } catch (e) {
        console.error("Error al precargar mapas:", e);
    }
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
