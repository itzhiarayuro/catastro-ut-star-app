import { useEffect, useRef } from 'react';
import { AppState } from '../types/catastro';
import {
    getPendingPhotosCount,
    saveFichaToStorage,
    getAllFichasFromStorage,
} from '../utils/storageManager';
import { useAppStore } from './useAppStore';
import { useAuth } from '../lib/firebase';
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
 * 
 * IMPORTANT: Reads fichas from IndexedDB (source of truth), NOT from RAM,
 * to avoid propagating stale/empty state during sync.
 */
export const useBackgroundSync = ({ safeSaveAllFichas }: UseBackgroundSyncParams) => {
    const { setFichas, isOnline, setPendingCount } = useAppStore();
    const { user, loading: authLoading } = useAuth();
    const syncingRef = useRef(false);

    useEffect(() => {
        const backgroundSync = async () => {
            if (!navigator.onLine) return;
            if (authLoading || !user?.uid) return; // Don't sync before auth is ready
            if (syncingRef.current) return; // Prevent overlapping syncs
            syncingRef.current = true;

            const now = new Date();
            const hour = now.getHours();
            const isNightWindow = hour >= 23 || hour <= 5; // 11 PM to 5 AM

            console.log(`🔄 Ciclo de sincronización de fondo (${hour}:${now.getMinutes()})...`);

            try {
                // 0. Migration Check (Ensures legacy data moves to IDB even if load failed)
                const savedLS = safeLocalStorageGet('fichas_star');
                if (savedLS) {
                    try {
                        const lsFichas = savedLS;
                        for (const f of Object.values(lsFichas) as any[]) {
                            await saveFichaToStorage(f);
                        }
                        safeLocalStorageRemove('fichas_star');
                        console.log("💾 Migración de fondo (LS -> IDB) exitosa. LS limpiado.");
                    } catch (e) { }
                }

                // 1. Data Sync — Read from IDB (source of truth), NOT from RAM
                const idbFichas = await getAllFichasFromStorage();
                
                // Filter to current user's fichas only
                const userFichas: Record<string, AppState> = {};
                Object.entries(idbFichas).forEach(([id, f]) => {
                    if (!f.createdBy || f.createdBy === user.uid) {
                        userFichas[id] = f;
                    }
                });

                const pendingFichas = Object.values(userFichas).filter(f => !f.synced && !f.deleted);
                if (pendingFichas.length > 0) {
                    console.log(`📤 Sincronizando ${pendingFichas.length} fichas pendientes...`);
                    const { syncFichasToFirestore } = await import('../utils/syncRegistry');
                    try {
                        const refreshedFichas = await syncFichasToFirestore(userFichas);
                        
                        // Update RAM with synced status
                        setFichas(refreshedFichas);

                        // Write ONLY the changed fichas back to IDB (upsert, not overwrite)
                        for (const f of Object.values(refreshedFichas)) {
                            if (f.synced) {
                                await saveFichaToStorage(f);
                            }
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
                            const count = await getPendingPhotosCount();
                            setPendingCount(count);
                        }
                    } catch (error) {
                        console.error("❌ Fallo en sincronización nocturna:", error);
                    }
                }
            } finally {
                syncingRef.current = false;
            }
        };

        const syncInterval = setInterval(backgroundSync, 30 * 60 * 1000); // 30 minutes
        // Initial run after a delay — ensures auth is ready
        const initialTimeout = setTimeout(backgroundSync, 10000);

        return () => {
            clearInterval(syncInterval);
            clearTimeout(initialTimeout);
        };
    }, [isOnline, user?.uid, authLoading]);
};
