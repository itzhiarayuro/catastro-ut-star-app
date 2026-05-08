/**
 * syncDriveToFirestore — Cloud Function HTTP
 *
 * Escanea la carpeta de un pozo en Google Drive y registra en el
 * `fotoList` de Firestore las fotos que existen en Drive pero que aún
 * no están listadas.  NUNCA elimina ni sobreescribe entradas existentes.
 *
 * Llamada via POST (requiere Bearer token de Firebase Auth):
 *   Body JSON: { municipio: "GRANADA", pozo: "PZ71" }
 *   o para escanear TODO un municipio:
 *   Body JSON: { municipio: "GRANADA" }
 *
 * Responde con:
 *   { success: true, processed: N, added: N, skipped: N, details: [...] }
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";

const DRIVE_ROOT_FOLDER_ID = "1JJFOP_OQot-n4sqfDORtJYuLQiNyoDZx";

// Mapea el nombre de archivo a campos de metadata que podemos inferir
// Ejemplo: PZ71-S1-T.JPG → tipo=TUBERIA_TAPA, categoria=SALIDA, subcategoria=S1
function inferMetadataFromFilename(filename: string, pozoId: string): Record<string, any> {
    const base = filename.toUpperCase().replace(/\.JPG$/i, "").replace(/\.JPEG$/i, "").replace(/\.PNG$/i, "");
    // Remove pozo prefix if present: e.g. "PZ71-S1-T" → "S1-T"
    const withoutPozo = base.replace(new RegExp(`^${pozoId.toUpperCase()}-?`, "i"), "");

    const parts = withoutPozo.split("-");
    const lastPart = parts[parts.length - 1];

    // Determine type from suffix
    let tipo = "GENERAL";
    let categoria = "PRINCIPAL";
    let subcategoria = withoutPozo;
    let esMedicion = false;

    if (lastPart === "T" || lastPart === "TAPA") {
        if (parts.length > 1 && (parts[0].startsWith("S") || parts[0].startsWith("E") || parts[0].startsWith("SUM"))) {
            tipo = "TUBERIA_TAPA";
        } else {
            tipo = "TAPA";
        }
    } else if (lastPart === "Z") {
        tipo = "MEDICION";
        esMedicion = true;
    } else if (lastPart === "I") {
        tipo = "INTERIOR";
    } else if (lastPart === "P") {
        tipo = "GENERAL";
    } else if (lastPart === "D") {
        tipo = "SUMIDERO";
    } else if (lastPart === "B") {
        tipo = "BATEA";
    } else if (lastPart === "PANORAMICA" || lastPart === "PAN") {
        tipo = "PANORAMICA";
    }

    // Determine category from prefix
    if (parts[0].startsWith("S") && parts[0] !== "SUM" && !parts[0].startsWith("SUM")) {
        categoria = "SALIDA";
        subcategoria = parts.slice(0, -1).join("-") || withoutPozo;
    } else if (parts[0].startsWith("E")) {
        categoria = "ENTRADA";
        subcategoria = parts.slice(0, -1).join("-") || withoutPozo;
    } else if (parts[0].startsWith("SUM")) {
        categoria = "SUMIDERO";
        subcategoria = parts.slice(0, -1).join("-") || withoutPozo;
    }

    return {
        tipo,
        categoria,
        subcategoria: subcategoria || withoutPozo,
        esMedicion,
        esExcluido: esMedicion, // las de medición se excluyen por defecto
        motivoExclusion: esMedicion ? "CONTIENE Z - FOTO DE PROFUNDIDAD" : undefined,
    };
}

async function getOrFindFolder(drive: any, name: string, parentId: string): Promise<string | null> {
    try {
        const res = await drive.files.list({
            q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            spaces: "drive",
        });
        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
        }
        return null;
    } catch {
        return null;
    }
}

async function listFilesInFolder(drive: any, folderId: string): Promise<{ id: string; name: string }[]> {
    const allFiles: { id: string; name: string }[] = [];
    let pageToken: string | undefined = undefined;

    do {
        const res: any = await drive.files.list({
            q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "nextPageToken, files(id, name)",
            spaces: "drive",
            pageSize: 1000,
            pageToken,
        });
        if (res.data.files) {
            allFiles.push(...res.data.files);
        }
        pageToken = res.data.nextPageToken;
    } while (pageToken);

    return allFiles;
}

export const syncDriveToFirestore = functions
    .runWith({
        secrets: ["DRIVE_SERVICE_ACCOUNT"],
        timeoutSeconds: 540,
        memory: "512MB",
    })
    .https.onRequest(async (req, res) => {
        // ── Auth check ──────────────────────────────────────────────────────
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Requiere Bearer token" });
            return;
        }
        const idToken = authHeader.split("Bearer ")[1];
        try {
            await admin.auth().verifyIdToken(idToken);
        } catch {
            res.status(401).json({ error: "Token inválido o expirado" });
            return;
        }

        // ── Params ──────────────────────────────────────────────────────────
        const body = req.body as { municipio?: string; pozo?: string };
        const targetMunicipio = (body.municipio || "").toUpperCase().trim();
        const targetPozo = (body.pozo || "").toUpperCase().trim();

        if (!targetMunicipio) {
            res.status(400).json({ error: "Se requiere el campo 'municipio'" });
            return;
        }

        // ── Drive auth ──────────────────────────────────────────────────────
        const saJson = process.env.DRIVE_SERVICE_ACCOUNT || "";
        if (!saJson) {
            res.status(500).json({ error: "DRIVE_SERVICE_ACCOUNT no configurado" });
            return;
        }
        const sa = JSON.parse(saJson);
        const jwtAuth = new google.auth.JWT(
            sa.client_email,
            undefined,
            sa.private_key,
            ["https://www.googleapis.com/auth/drive.readonly"]
        );
        const drive = google.drive({ version: "v3", auth: jwtAuth });

        // ── Navigate Drive tree: ROOT/MUNICIPIO/CATASTRO ────────────────────
        const driveRootId = DRIVE_ROOT_FOLDER_ID;
        const municipioFolderId = await getOrFindFolder(drive, targetMunicipio, driveRootId);
        if (!municipioFolderId) {
            res.status(404).json({ error: `Carpeta de municipio '${targetMunicipio}' no encontrada en Drive` });
            return;
        }

        const catastroFolderId = await getOrFindFolder(drive, "CATASTRO", municipioFolderId);
        if (!catastroFolderId) {
            res.status(404).json({ error: `Carpeta CATASTRO dentro de '${targetMunicipio}' no encontrada en Drive` });
            return;
        }

        // ── Get list of pozo folders to process ─────────────────────────────
        let pozoFolders: { id: string; name: string }[] = [];
        if (targetPozo) {
            // Single pozo mode
            const pozoFolderId = await getOrFindFolder(drive, targetPozo, catastroFolderId);
            if (!pozoFolderId) {
                res.status(404).json({ error: `Carpeta del pozo '${targetPozo}' no encontrada` });
                return;
            }
            pozoFolders = [{ id: pozoFolderId, name: targetPozo }];
        } else {
            // All pozos in municipio
            const res2 = await drive.files.list({
                q: `'${catastroFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: "files(id, name)",
                spaces: "drive",
                pageSize: 1000,
            });
            pozoFolders = (res2.data.files || [])
                .filter((f: any) => f.id && f.name)
                .map((f: any) => ({ id: f.id as string, name: f.name as string }));
        }

        // ── Process each pozo ───────────────────────────────────────────────
        const db = admin.firestore();
        const details: any[] = [];
        let totalAdded = 0;
        let totalSkipped = 0;

        for (const pozoFolder of pozoFolders) {
            const pozoName = pozoFolder.name.toUpperCase();
            const docId = `${targetMunicipio}_${pozoName}`;
            const fichaRef = db.collection("fichas").doc(docId);

            // Get current Firestore doc
            const fichaSnap = await fichaRef.get();
            if (!fichaSnap.exists) {
                details.push({ pozo: pozoName, status: "NO_FIRESTORE_DOC", added: 0 });
                continue;
            }

            const fichaData = fichaSnap.data()!;
            const existingFotoList: any[] = fichaData.fotoList || [];

            // Build a set of known filenames (case-insensitive)
            const knownFilenames = new Set(
                existingFotoList.map((f: any) => (f.filename || "").toUpperCase())
            );

            // List files in Drive folder for this pozo
            const driveFiles = await listFilesInFolder(drive, pozoFolder.id);

            const newEntries: any[] = [];
            for (const file of driveFiles) {
                const upperName = file.name.toUpperCase();
                // Skip non-image files
                if (!upperName.match(/\.(JPG|JPEG|PNG|HEIC|WEBP)$/)) continue;

                if (knownFilenames.has(upperName)) {
                    totalSkipped++;
                    continue; // Already registered — DO NOT TOUCH
                }

                // Infer metadata from filename
                const meta = inferMetadataFromFilename(file.name, pozoName);

                const newEntry: any = {
                    id: `foto_drive_${file.id}`,
                    filename: file.name,
                    driveId: file.id,
                    idPozo: pozoName,
                    pozoId: pozoName,
                    binaryStripped: true,
                    syncedFromDrive: true,
                    syncedAt: new Date().toISOString(),
                    ...meta,
                };
                // Remove undefined values (motivoExclusion if not medicion)
                Object.keys(newEntry).forEach(k => newEntry[k] === undefined && delete newEntry[k]);

                newEntries.push(newEntry);
                knownFilenames.add(upperName);
                totalAdded++;
            }

            if (newEntries.length > 0) {
                const mergedFotoList = [...existingFotoList, ...newEntries];
                await fichaRef.update({
                    fotoList: mergedFotoList,
                    driveScannedAt: new Date().toISOString(),
                });
                details.push({ pozo: pozoName, status: "UPDATED", added: newEntries.length, files: newEntries.map(e => e.filename) });
            } else {
                details.push({ pozo: pozoName, status: "UP_TO_DATE", added: 0 });
            }
        }

        res.status(200).json({
            success: true,
            municipio: targetMunicipio,
            pozo: targetPozo || "(todos)",
            processed: pozoFolders.length,
            added: totalAdded,
            skipped: totalSkipped,
            details,
        });
    });
