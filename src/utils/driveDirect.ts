/**
 * driveDirect — cliente para el nuevo endpoint fetchDrivePhotoByIds.
 *
 * Descarga fotos desde Drive en lotes de 20 ids, con hasta 4 lotes en paralelo
 * (efectivo = 80 solicitudes concurrentes hacia el backend; el backend a su vez
 * paraleliza 10 contra Drive API).
 *
 * No toca nada del camino actual. Se usa solo desde usePdfExportFast.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { withConnectivityRetry, ConnectivityCallback } from "./connectivity";

export interface FetchPhotosProgress {
    done: number;
    total: number;
    failed: number;
    waitingNetwork?: boolean;
}

export type DriveBatchResult = Record<string, string | null>;

const BATCH_SIZE = 20;            // coincide con MAX_BATCH del backend
const BATCH_CONCURRENCY = 4;      // nº de lotes simultáneos
const CALLABLE_TIMEOUT_MS = 120_000;

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/**
 * Descarga fotos por driveId en lote. Nunca lanza: devuelve null para los
 * que fallen, así el llamador puede decidir si hacer fallback.
 *
 * Si la red cae durante la descarga, pausa y espera a que vuelva (hasta 10
 * reconexiones automáticas) antes de reintentar cada lote.
 */
export async function fetchPhotosByDriveIds(
    driveIds: string[],
    onProgress?: (p: FetchPhotosProgress) => void
): Promise<DriveBatchResult> {
    const clean = Array.from(new Set(driveIds.filter(Boolean)));
    if (clean.length === 0) return {};

    const functions = getFunctions();
    const fetchBatch = httpsCallable(functions, "fetchDrivePhotoByIds", {
        timeout: CALLABLE_TIMEOUT_MS,
    });

    const lotes = chunk(clean, BATCH_SIZE);
    const result: DriveBatchResult = {};
    let done = 0;
    let failed = 0;

    const queue = [...lotes];
    const emit = () => onProgress?.({ done, total: clean.length, failed });

    const onConnStatus: ConnectivityCallback = (status, attempt) => {
        if (status === "lost")    onProgress?.({ done, total: clean.length, failed, waitingNetwork: true });
        if (status === "waiting") onProgress?.({ done, total: clean.length, failed, waitingNetwork: true });
        if (status === "restored") onProgress?.({ done, total: clean.length, failed, waitingNetwork: false });
    };

    async function runLoteWithRetry(lote: string[]): Promise<DriveBatchResult> {
        return withConnectivityRetry(
            async () => {
                const res = await fetchBatch({ driveIds: lote });
                return (res.data || {}) as DriveBatchResult;
            },
            10,          // hasta 10 reconexiones automáticas
            onConnStatus
        );
    }

    async function worker() {
        while (queue.length > 0) {
            const lote = queue.shift();
            if (!lote) return;
            try {
                const data = await runLoteWithRetry(lote);
                for (const id of lote) {
                    const v = data[id] ?? null;
                    result[id] = v;
                    if (v === null) failed++;
                }
            } catch {
                for (const id of lote) {
                    result[id] = null;
                    failed++;
                }
            }
            done += lote.length;
            emit();
        }
    }

    emit();
    const n = Math.min(BATCH_CONCURRENCY, lotes.length);
    await Promise.all(Array.from({ length: n }, () => worker()));
    return result;
}
