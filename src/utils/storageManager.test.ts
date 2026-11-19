import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB as fakeIndexedDB } from 'fake-indexeddb';

Object.defineProperty(globalThis, 'indexedDB', { value: fakeIndexedDB, configurable: true });

test('abre IndexedDB v4 existente y conserva fichas y fotos', async () => {
    const seeded = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('UT_STAR_STORAGE', 4);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('fichas_locales', { keyPath: 'id' });
            request.result.createObjectStore('fotos_pendientes', { keyPath: 'id' });
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
    const transaction = seeded.transaction(['fichas_locales', 'fotos_pendientes'], 'readwrite');
    transaction.objectStore('fichas_locales').put({ id: 'ficha-173', pozo: 'PZ173', synced: false });
    transaction.objectStore('fotos_pendientes').put({ id: 'foto-173', blob: 'pendiente' });
    await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    seeded.close();

    const storage = await import('./storageManager');
    const db = await storage.initDB();
    assert.equal(db.version, 4);
    db.close();
    const fichas = await storage.getAllFichasFromStorage();
    const foto = await storage.getPhotoFromStorage('foto-173');
    assert.equal(fichas['ficha-173'].pozo, 'PZ173');
    assert.equal(fichas['ficha-173'].synced, false);
    assert.equal(foto?.blob, 'pendiente');
});
