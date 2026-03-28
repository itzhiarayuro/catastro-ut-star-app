import { useEffect } from 'react';
import { useAppStore } from './useAppStore';
import { auth } from '../lib/firebase';
import { 
    getPendingPhotosCount 
} from '../utils/storageManager';
import { safeLocalStorageGet } from '../utils/ui';

/**
 * Lightweight hook that only tracks pending counts for UI badges.
 * 
 * IMPORTANT: Ficha synchronization is handled EXCLUSIVELY by useBackgroundSync.
 * This hook does NOT sync fichas to avoid duplicate timers racing to overwrite data.
 */
export const useFirebaseSync = () => {
    const { 
        setPendingCount, 
        setPendingMarcaciones 
    } = useAppStore();

    const checkPending = async () => {
        const count = await getPendingPhotosCount();
        setPendingCount(count);

        const savedMarc = safeLocalStorageGet('marcaciones_star', []);
        const currentUser = auth.currentUser;
        const myPendingMarcaciones = (savedMarc as any[]).filter(m => 
            !m.synced && !m.deleted && (!m.createdBy || m.createdBy === currentUser?.uid)
        );
        setPendingMarcaciones(myPendingMarcaciones.length);
    };

    useEffect(() => {
        checkPending();
        const pendingId = setInterval(checkPending, 30000);
        
        return () => {
            clearInterval(pendingId);
        };
    }, []);

    return { checkPending };
};
