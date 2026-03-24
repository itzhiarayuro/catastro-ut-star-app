import { useEffect } from 'react';
import { AppState } from '../types/catastro';
import {
    getPendingPhotosCount,
    saveFichaToStorage,
} from '../utils/storageManager';
import { useAppStore } from './useAppStore';
import { safeLocalStorageGet, safeLocalStorageRemove } from '../utils/ui';

interface UseBackgroundSyncParams {
    safeSaveAllFichas: (fichas: Record<string, AppState>) => Promise<void>;
}

/**
 * Background sync hook that runs every 30 minutes.
 * Handles:
 * - Migration from LocalStorage to IndexedDB
 * - Syncing pending fichas to Firestore
 * - Nightly photo uploads (11PM-5AM window)
 */
export const useBackgroundSync = ({ safeSaveAllFichas }: UseBackgroundSyncParams) => {
    const { fichas, setFichas, isOnline, setPendingCount } = useAppStore();

    useEffect(() => {
        const backgroundSync = async () => {
            if (!navigator.onLine) return;

            const now = new Date();
            const hour = now.getHours();
            const isNightWindow = hour >= 23 || hour <= 5; // 11 PM to 5 AM

            console.log(`🔄 Ciclo de sincronización de fondo (${hour}:${now.getMinutes()})...`);

            // 0. Migration Check (Ensures legacy data moves to IDB even if load failed)
            const savedLS = safeLocalStorageGet('fichas_star');
            if (savedLS) {
                try {
                    const lsFichas = savedLS;
                    for (const f of Object.values(lsFichas) as any[]) {
                        await saveFichaToStorage(f);
                    }
                    // ✅ Remove from localStorage after successful IDB migration
                    // to prevent QuotaExceededError loop on every sync cycle
                    safeLocalStorageRemove('fichas_star');
                    console.log("💾 Migración de fondo (LS -> IDB) exitosa. LS limpiado.");
                } catch (e) { }
            }

            // 1. Data Sync (Always tries every 30 mins if online)
            const pendingFichas = Object.values(fichas).filter(f => !f.synced && !f.deleted);
            if (pendingFichas.length > 0) {
                console.log(`📤 Sincronizando ${pendingFichas.length} fichas pendientes...`);
                const { syncFichasToFirestore } = await import('../utils/syncRegistry');
                try {
                    const refreshedFichas = await syncFichasToFirestore(fichas);
                    setFichas(refreshedFichas);

                    // Persist updated status
                    await safeSaveAllFichas(refreshedFichas);

                    for (const f of Object.values(refreshedFichas)) {
                        await saveFichaToStorage(f);
                    }
                } catch (error) {
                    console.error("❌ Error sync fichas fondo:", error);
                }
            }

            // 2. Nightly Sync (Photos)
            if (isNightWindow) {
                console.log("🌙 Ventana nocturna detectada. Iniciando subida de fotos silenciosa...");
                try {
                    const { syncPhotosToDrive } = await import('../utils/driveSync');
                    const pendingPhotosCount = await getPendingPhotosCount();

                    if (pendingPhotosCount > 0) {
                        await syncPhotosToDrive((p) => {
                            if (p.error) console.error("Error en sync nocturno de fotos:", p.error);
                        });
                        // Update UI counts after sync
                        const count = await getPendingPhotosCount();
                        setPendingCount(count);
                    }
                } catch (error) {
                    console.error("❌ Fallo en sincronización nocturna:", error);
                }
            }
        };

        const syncInterval = setInterval(backgroundSync, 30 * 60 * 1000); // 30 minutes
        // Initial run after a short delay for app stability
        const initialTimeout = setTimeout(backgroundSync, 5000);

        return () => {
            clearInterval(syncInterval);
            clearTimeout(initialTimeout);
        };
    }, [fichas, isOnline]);
};
