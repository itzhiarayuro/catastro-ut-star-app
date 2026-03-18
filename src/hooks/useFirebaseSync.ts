import { useEffect, useRef } from 'react';
import { useAppStore } from './useAppStore';
import { AppState } from '../types/catastro';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
    saveFichaToStorage, 
    getPendingPhotosCount 
} from '../utils/storageManager';
import { safeLocalStorageGet } from '../utils/ui';

export const useFirebaseSync = () => {
    const { 
        fichas, 
        setFichas, 
        isOnline, 
        setPendingCount, 
        setPendingMarcaciones 
    } = useAppStore();

    const syncInterval = useRef<NodeJS.Timeout | null>(null);

    const checkPending = async () => {
        const count = await getPendingPhotosCount();
        setPendingCount(count);

        const savedMarc = safeLocalStorageGet('marcaciones_star', []);
        const pendingM = (savedMarc as any[]).filter(m => !m.synced && !m.deleted).length;
        setPendingMarcaciones(pendingM);
    };

    const backgroundSync = async () => {
        if (!navigator.onLine) return;

        console.log(`🔄 Ciclo de sincronización de fondo...`);

        // 1. Sincronización de Fichas
        const pendingFichas = Object.values(fichas).filter((f: AppState) => !f.synced && !f.deleted);
        if (pendingFichas.length > 0) {
            try {
                const { syncFichasToFirestore } = await import('../utils/syncRegistry');
                const refreshedFichas = await syncFichasToFirestore(fichas);
                setFichas(refreshedFichas);
                
                // Persistencia en IDB
                for (const f of Object.values(refreshedFichas) as AppState[]) {
                    await saveFichaToStorage(f);
                }
            } catch (error) {
                console.error("❌ Error sync fichas fondo:", error);
            }
        }
    };

    useEffect(() => {
        checkPending();
        const pendingId = setInterval(checkPending, 30000);
        
        const syncId = setInterval(backgroundSync, 30 * 60 * 1000);
        const initialTimeout = setTimeout(backgroundSync, 5000);

        return () => {
            clearInterval(pendingId);
            clearInterval(syncId);
            clearTimeout(initialTimeout);
        };
    }, [isOnline]);

    return { checkPending, backgroundSync };
};
