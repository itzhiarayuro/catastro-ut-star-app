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

    // Crear la carpeta si no existe
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

export const syncPhotosToDrive = functions.runWith({
    secrets: ["DRIVE_SERVICE_ACCOUNT", "DRIVE_ROOT_FOLDER_ID"]
}).firestore
    .document("fichas/{fichaId}")
    .onWrite(async (change, context) => {
        const data = change.after.exists ? change.after.data() : null;
        if (!data || !data.fotoList || data.fotoList.length === 0) return null;

        // 1. Configurar Auth desde Firebase Secret
        const serviceAccountValue = process.env.DRIVE_SERVICE_ACCOUNT || "";
        if (!serviceAccountValue) {
            console.error("Falta el secreto DRIVE_SERVICE_ACCOUNT");
            return null;
        }

        const serviceAccount = JSON.parse(serviceAccountValue);
        const auth = new google.auth.JWT(
            serviceAccount.client_email,
            undefined,
            serviceAccount.private_key,
            ["https://www.googleapis.com/auth/drive.file"]
        );
        const drive = google.drive({ version: "v3", auth });

        // Usar también la raíz de drive desde secreto o env
        const driveRootId = process.env.DRIVE_ROOT_FOLDER_ID || DRIVE_ROOT_FOLDER_ID;

        const municipio = data.municipio || "SIN_MUNICIPIO";
        const barrio = data.barrio || "SIN_BARRIO";
        const pozo = data.pozo || "SIN_POZO";

        try {
            // 2. Navegar/Crear Estructura: Raíz -> Municipio -> Barrio -> Pozo
            console.log(`Iniciando sincronización para Pozo: ${pozo} en ${municipio}`);

            const municipioId = await getOrCreateFolder(drive, municipio.toUpperCase(), driveRootId);
            const barrioId = await getOrCreateFolder(drive, barrio.toUpperCase(), municipioId);
            const pozoIdFolder = await getOrCreateFolder(drive, pozo.toUpperCase(), barrioId);

            const updatedFotoList = [...data.fotoList];
            let hasChanges = false;

            // 3. Procesar cada foto
            for (let i = 0; i < updatedFotoList.length; i++) {
                const foto = updatedFotoList[i];

                // Si ya está sincronizada, saltar
                if (foto.driveId) continue;

                console.log(`Subiendo foto: ${foto.filename}`);

                // Extraer buffer de Base64
                const base64Data = foto.blobId.split(",")[1];
                const buffer = Buffer.from(base64Data, "base64");
                const stream = new Readable();
                stream.push(buffer);
                stream.push(null);

                const fileMetadata = {
                    name: foto.filename,
                    parents: [pozoIdFolder],
                };
                const media = {
                    mimeType: "image/jpeg",
                    body: stream,
                };

                const driveFile = await drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: "id",
                });

                if (driveFile.data.id) {
                    updatedFotoList[i].driveId = driveFile.data.id;
                    updatedFotoList[i].syncedAt = new Date().toISOString();
                    hasChanges = true;
                }
            }

            // 4. Actualizar Firestore con los IDs de Drive para evitar duplicados
            if (hasChanges) {
                await change.after.ref.update({
                    fotoList: updatedFotoList,
                    lastSyncAt: new Date().toISOString()
                });
                console.log("Firestore actualizado con IDs de Drive.");
            }

        } catch (error) {
            console.error("Error sincronizando con Drive:", error);
        }

        return null;
    });
