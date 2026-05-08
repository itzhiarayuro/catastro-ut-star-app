/**
 * fetchDrivePhotoByIds — Cloud Function callable
 *
 * Descarga fotos de Google Drive en lote usando el service account ya configurado.
 * Reemplaza el camino lento a través de GAS para fotos que ya tienen driveId
 * persistido en Firestore (fotoList[i].driveId).
 *
 * Contrato:
 *   request.data = {
 *     driveIds: string[],         // máx. 20 por llamada
 *     optimize?: boolean          // default true — comprime JPEG server-side con Sharp
 *   }
 *   response     = { [driveId]: string | null }  // data URL base64, null si error
 *
 * Seguridad:
 *   - Requiere Firebase Auth (context.auth)
 *   - Scope Drive: drive.readonly (mínimo necesario)
 *   - Usa el mismo secret DRIVE_SERVICE_ACCOUNT que syncPhotosToDrive
 *
 * NO modifica nada existente. Para activarla hay que exportarla desde index.ts
 * (una sola línea — ver instrucciones al final del archivo).
 */

import * as functions from "firebase-functions";
import { google } from "googleapis";

const MAX_BATCH = 20;
const INTERNAL_POOL = 10; // paralelismo interno contra Drive API
const PER_FILE_TIMEOUT_MS = 25_000;

// Sharp: libvips nativo — 10-20x más rápido que canvas del browser.
// Carga perezosa — solo si optimize=true.
let _sharp: any = null;
async function getSharp() {
    if (_sharp) return _sharp;
    try {
        _sharp = (await import("sharp") as any).default ?? (await import("sharp") as any);
        return _sharp;
    } catch (err) {
        console.warn("[fetchDrivePhotoByIds] Sharp no disponible, usando imagen original");
        return null;
    }
}

type Result = Record<string, string | null>;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout ${label} tras ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([p, timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function fetchOne(drive: any, driveId: string, optimize: boolean): Promise<string | null> {
    try {
        const metaPromise = drive.files.get({
            fileId: driveId,
            fields: "id, mimeType, size",
        });
        const meta = await withTimeout(metaPromise, PER_FILE_TIMEOUT_MS, `meta ${driveId}`) as any;
        const originalMime = (meta?.data?.mimeType) || "image/jpeg";

        const mediaPromise = drive.files.get(
            { fileId: driveId, alt: "media" },
            { responseType: "arraybuffer" }
        );
        const media = await withTimeout(mediaPromise, PER_FILE_TIMEOUT_MS, `media ${driveId}`) as any;
        let buffer = Buffer.from(media.data as ArrayBuffer);
        let finalMime = originalMime;

        // Optimización server-side con Sharp — MozJPEG + chroma subsampling 4:2:0
        // Calidad 82 es visualmente indistinguible pero reduce ~60% el peso
        if (optimize && originalMime.startsWith("image/")) {
            const sharp = await getSharp();
            if (sharp) {
                try {
                    const originalSize = buffer.length;
                    buffer = await sharp(buffer)
                        .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
                        .toBuffer();
                    finalMime = "image/jpeg";
                    const ratio = Math.round((buffer.length / originalSize) * 100);
                    console.log(`[fetchDrivePhotoByIds] ${driveId}: ${originalSize}→${buffer.length} bytes (${ratio}%)`);
                } catch (optErr: any) {
                    console.warn(`[fetchDrivePhotoByIds] Sharp falló en ${driveId}, usando original: ${optErr?.message}`);
                    // buffer original se mantiene
                }
            }
        }

        const base64 = buffer.toString("base64");
        return `data:${finalMime};base64,${base64}`;
    } catch (err: any) {
        console.warn(`[fetchDrivePhotoByIds] Falló ${driveId}: ${err?.message || err}`);
        return null;
    }
}

async function runPool(
    ids: string[],
    worker: (id: string) => Promise<string | null>,
    poolSize: number
): Promise<Result> {
    const result: Result = {};
    let cursor = 0;
    const runners: Promise<void>[] = [];
    const effective = Math.min(poolSize, ids.length);

    for (let i = 0; i < effective; i++) {
        runners.push((async () => {
            while (true) {
                const idx = cursor++;
                if (idx >= ids.length) return;
                const id = ids[idx];
                result[id] = await worker(id);
            }
        })());
    }
    await Promise.all(runners);
    return result;
}

export const fetchDrivePhotoByIds = functions
    .runWith({
        secrets: ["DRIVE_SERVICE_ACCOUNT"],
        memory: "1GB",       // subido para dar margen a Sharp (libvips reserva buffers)
        timeoutSeconds: 300,
    })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Requiere sesión de Firebase Auth"
            );
        }

        const driveIds: unknown = data?.driveIds;
        if (!Array.isArray(driveIds) || driveIds.length === 0) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Se espera { driveIds: string[] } no vacío"
            );
        }
        if (driveIds.length > MAX_BATCH) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                `Máximo ${MAX_BATCH} driveIds por llamada`
            );
        }
        const cleanIds = driveIds
            .filter((v): v is string => typeof v === "string" && v.length > 0)
            .filter((v, i, a) => a.indexOf(v) === i); // dedup

        // Optimización server-side — por defecto activa (reduce ~60% el peso)
        const optimize = (data as any)?.optimize !== false;

        if (cleanIds.length === 0) {
            return {} as Result;
        }

        const saJson = process.env.DRIVE_SERVICE_ACCOUNT || "";
        if (!saJson) {
            throw new functions.https.HttpsError(
                "failed-precondition",
                "DRIVE_SERVICE_ACCOUNT no configurado"
            );
        }
        let sa: any;
        try {
            sa = JSON.parse(saJson);
        } catch {
            throw new functions.https.HttpsError(
                "failed-precondition",
                "DRIVE_SERVICE_ACCOUNT inválido"
            );
        }

        const auth = new google.auth.JWT(
            sa.client_email,
            undefined,
            sa.private_key,
            ["https://www.googleapis.com/auth/drive.readonly"]
        );
        const drive = google.drive({ version: "v3", auth });

        const result = await runPool(
            cleanIds,
            (id) => fetchOne(drive, id, optimize),
            INTERNAL_POOL
        );
        return result;
    });

/*
 * ───────────────────────────────────────────────────────────────
 * WIRE-UP (paso manual, hacerlo SOLO cuando estés listo para deploy):
 *
 *   1. Abrir functions/src/index.ts
 *   2. Añadir al FINAL del archivo esta línea:
 *
 *        export { fetchDrivePhotoByIds } from "./fetchDrivePhotoByIds";
 *
 *   3. Desplegar SOLO esta función (sin tocar las demás):
 *
 *        firebase deploy --only functions:fetchDrivePhotoByIds
 *
 *   Esto NO redespliega generateFicha ni syncPhotosToDrive.
 * ───────────────────────────────────────────────────────────────
 */
