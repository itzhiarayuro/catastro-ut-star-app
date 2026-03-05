import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { Readable } from "stream";

admin.initializeApp();

const DRIVE_ROOT_FOLDER_ID = "1JJFOP_OQot-n4sqfDORtJYuLQiNyoDZx";

/**
 * Obtiene o crea una carpeta en Google Drive por nombre y padre
 */
async function getOrCreateFolder(drive: any, folderName: string, parentId: string): Promise<string> {
    const response = await drive.files.list({
        q: `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        spaces: "drive",
    });

    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
    }

    const fileMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
    };

    const folder = await drive.files.create({
        resource: fileMetadata,
        fields: "id",
    });

    return folder.data.id;
}

// ─────────────────────────────────────────────────
// SINCRONIZACIÓN DE FOTOS DE FICHAS (CATASTRO)
// ─────────────────────────────────────────────────
export const syncPhotosToDrive = functions.runWith({
    secrets: ["DRIVE_SERVICE_ACCOUNT", "DRIVE_ROOT_FOLDER_ID"]
}).firestore
    .document("fichas/{fichaId}")
    .onWrite(async (change, context) => {
        const data = change.after.exists ? change.after.data() : null;
        if (!data || !data.fotoList || data.fotoList.length === 0) return null;

        const serviceAccountValue = process.env.DRIVE_SERVICE_ACCOUNT || "";
        if (!serviceAccountValue) return null;

        const serviceAccount = JSON.parse(serviceAccountValue);
        const auth = new google.auth.JWT(
            serviceAccount.client_email,
            undefined,
            serviceAccount.private_key,
            ["https://www.googleapis.com/auth/drive.file"]
        );
        const drive = google.drive({ version: "v3", auth });
        const driveRootId = process.env.DRIVE_ROOT_FOLDER_ID || DRIVE_ROOT_FOLDER_ID;

        const municipio = data.municipio || "SIN_MUNICIPIO";
        const barrio = data.barrio || "SIN_BARRIO";
        const pozo = data.pozo || "SIN_POZO";

        try {
            const municipioId = await getOrCreateFolder(drive, municipio.toUpperCase(), driveRootId);
            const barrioId = await getOrCreateFolder(drive, barrio.toUpperCase(), municipioId);
            const pozoIdFolder = await getOrCreateFolder(drive, pozo.toUpperCase(), barrioId);

            const updatedFotoList = [...data.fotoList];
            let hasChanges = false;

            for (let i = 0; i < updatedFotoList.length; i++) {
                const foto = updatedFotoList[i];
                if (foto.driveId) continue;

                const base64Data = foto.blobId.split(",")[1];
                const buffer = Buffer.from(base64Data, "base64");
                const stream = new Readable();
                stream.push(buffer);
                stream.push(null);

                const driveFile = await drive.files.create({
                    requestBody: { name: foto.filename, parents: [pozoIdFolder] },
                    media: { mimeType: "image/jpeg", body: stream },
                    fields: "id",
                });

                if (driveFile.data.id) {
                    updatedFotoList[i].driveId = driveFile.data.id;
                    updatedFotoList[i].syncedAt = new Date().toISOString();
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await change.after.ref.update({
                    fotoList: updatedFotoList,
                    lastSyncAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error("Error Ficha Drive Sync:", error);
        }
        return null;
    });

// ─────────────────────────────────────────────────
// SINCRONIZACIÓN DE FOTOS DE MARCACIÓN A DRIVE
// ─────────────────────────────────────────────────
export const syncMarcacionPhotosToDrive = functions.runWith({
    secrets: ["DRIVE_SERVICE_ACCOUNT", "DRIVE_ROOT_FOLDER_ID"]
}).firestore
    .document("marcaciones/{mId}")
    .onWrite(async (change, context) => {
        const data = change.after.exists ? change.after.data() : null;
        if (!data || !data.fotos) return null;

        const serviceAccountValue = process.env.DRIVE_SERVICE_ACCOUNT || "";
        if (!serviceAccountValue) return null;

        const serviceAccount = JSON.parse(serviceAccountValue);
        const auth = new google.auth.JWT(
            serviceAccount.client_email,
            undefined,
            serviceAccount.private_key,
            ["https://www.googleapis.com/auth/drive.file"]
        );
        const drive = google.drive({ version: "v3", auth });
        const driveRootId = process.env.DRIVE_ROOT_FOLDER_ID || DRIVE_ROOT_FOLDER_ID;

        try {
            const municipio = data.municipio || "SIN_MUNICIPIO";
            const marcacionDirId = await getOrCreateFolder(drive, "MARCACION", driveRootId);
            const municipioId = await getOrCreateFolder(drive, municipio.toUpperCase(), marcacionDirId);

            const fotoKeys = ["panoramica", "tapa"] as const;
            let hasChanges = false;
            const updatedFotos = { ...data.fotos };

            for (const key of fotoKeys) {
                const foto = updatedFotos[key];
                if (!foto || foto.driveId || !foto.blobId) continue;

                const base64Data = foto.blobId.split(",")[1];
                const buffer = Buffer.from(base64Data, "base64");
                const stream = new Readable();
                stream.push(buffer);
                stream.push(null);

                const driveFile = await drive.files.create({
                    requestBody: { name: foto.filename, parents: [municipioId] },
                    media: { mimeType: "image/jpeg", body: stream },
                    fields: "id",
                });

                if (driveFile.data.id) {
                    updatedFotos[key].driveId = driveFile.data.id;
                    updatedFotos[key].syncedAt = new Date().toISOString();
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await change.after.ref.update({
                    fotos: updatedFotos,
                    lastSyncAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error("Error Marcación Drive Sync:", error);
        }
        return null;
    });

// ─────────────────────────────────────────────────
// EXPORTACIÓN DE LA FUNCIÓN DE GENERACIÓN DE FICHA
// ─────────────────────────────────────────────────
export { generateFicha } from "./generateFicha";
