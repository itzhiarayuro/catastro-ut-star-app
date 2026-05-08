import { useEffect, useRef } from 'react';
import { auth, useAuth } from '../lib/firebase';
import { useAppStore } from './useAppStore';

const BASE_URL = import.meta.env.PROD
    ? 'https://us-central1-catastro-ut-star.cloudfunctions.net'
    : 'http://127.0.0.1:5001/catastro-ut-star/us-central1';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;     // cada 5 min
const INITIAL_DELAY_MS = 8 * 1000;           // 8s tras montar (no bloquear startup)
const MIN_GAP_BETWEEN_RUNS_MS = 60 * 1000;   // dedup: no relanzar antes de 1 min

/**
 * Sincroniza Drive → Firestore en background para el municipio activo.
 *
 * Se ejecuta:
 *  - 8s después de montar (sync inicial sin bloquear startup)
 *  - Cada vez que cambia el municipio activo (debounced)
 *  - Periódicamente cada 5 min
 *
 * Logs a consola, sin toasts (es invisible al usuario).
 * No bloquea la UI: errores se silencian (solo console.warn).
 */
export const useAutoSyncDrive = () => {
    const { user } = useAuth();
    const municipio = useAppStore(s => (s as any).municipio as string | undefined);
    const lastRunRef = useRef<{ municipio: string; ts: number } | null>(null);
    const inFlightRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
        if (!user || !municipio) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;

        const runSync = async () => {
            // Dedup: si ya hubo un sync para este municipio en menos de 1 min, salta
            const last = lastRunRef.current;
            if (last && last.municipio === municipio && (Date.now() - last.ts) < MIN_GAP_BETWEEN_RUNS_MS) {
                return;
            }
            // Evitar dos en vuelo simultáneamente
            if (inFlightRef.current) return;

            const job = (async () => {
                try {
                    const token = await auth.currentUser?.getIdToken();
                    if (!token) return;

                    const t0 = Date.now();
                    const res = await fetch(`${BASE_URL}/syncDriveToFirestore`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ municipio })
                    });

                    if (!res.ok) {
                        const txt = await res.text().catch(() => '');
                        console.warn(`[AutoSync Drive] HTTP ${res.status} para ${municipio}: ${txt.slice(0, 120)}`);
                        return;
                    }

                    const data = await res.json();
                    const dur = Date.now() - t0;
                    console.log(`[AutoSync Drive] ${municipio}: +${data.added ?? 0} nuevas, ${data.skipped ?? 0} existentes (${dur}ms)`);

                    lastRunRef.current = { municipio, ts: Date.now() };
                } catch (e: any) {
                    console.warn(`[AutoSync Drive] Falló para ${municipio}:`, e?.message || e);
                }
            })();

            inFlightRef.current = job;
            try { await job; } finally { inFlightRef.current = null; }
        };

        const initialTimeout = setTimeout(runSync, INITIAL_DELAY_MS);
        const interval = setInterval(runSync, SYNC_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [user, municipio]);
};
