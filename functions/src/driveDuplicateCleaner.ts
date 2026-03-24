import * as functions from "firebase-functions";
import { google } from "googleapis";

const DRIVE_ROOT_FOLDER_ID = "1JJFOP_OQot-n4sqfDORtJYuLQiNyoDZx";

export const cleanDriveDuplicates = functions.runWith({
    timeoutSeconds: 540,
    memory: '1GB',
    secrets: ["DRIVE_SERVICE_ACCOUNT"]
}).https.onCall(async (data: { runMode: "preview" | "delete" }, context) => {
    // 1. Verificación de permisos restrictivos
    if (!context.auth || context.auth.token.email !== 'juanvegas003@gmail.com') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Solo el administrador juanvegas003@gmail.com tiene acceso a esta función.'
        );
    }

    const { runMode = "preview" } = data;

    // 2. Autenticación con Google Drive usando el Service Account
    const serviceAccountValue = process.env.DRIVE_SERVICE_ACCOUNT || "";
    if (!serviceAccountValue) {
        throw new functions.https.HttpsError('failed-precondition', 'La cuenta de servicio de Drive no está configurada.');
    }

    const serviceAccount = JSON.parse(serviceAccountValue);
    const auth = new google.auth.JWT(
        serviceAccount.client_email,
        undefined,
        serviceAccount.private_key,
        ["https://www.googleapis.com/auth/drive"]
    );
    const drive = google.drive({ version: "v3", auth });

    try {
        // 3. Obtener todos los archivos bajo DRIVE_ROOT_FOLDER_ID
        const allFiles: any[] = [];
        const foldersToScan = [DRIVE_ROOT_FOLDER_ID];
        let processedCount = 0;

        while (foldersToScan.length > 0) {
            const currentFolderId = foldersToScan.shift();
            let pageToken: string | undefined = undefined;

            do {
                console.log(`Buscando en la carpeta: ${currentFolderId}`);
                const results: any = await drive.files.list({
                    q: `'${currentFolderId}' in parents and trashed=false`,
                    pageSize: 1000,
                    fields: "nextPageToken, files(id,name,size,mimeType,parents,md5Checksum,createdTime)",
                    pageToken,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                    corpora: "allDrives"
                });

                const items = results.data.files || [];
                console.log(`Se encontraron ${items.length} elementos en ${currentFolderId}`);
                
                for (const item of items) {
                    if (item.mimeType === 'application/vnd.google-apps.folder') {
                        if (item.id) foldersToScan.push(item.id);
                    } else {
                         // Solo archivos con tamaño de byte válido
                         const fileSize = parseInt(item.size || "0", 10);
                         if (fileSize > 0 && item.md5Checksum) {
                             allFiles.push({
                                 id: item.id,
                                 name: item.name,
                                 size: fileSize,
                                 md5: item.md5Checksum,
                                 createdTime: new Date(item.createdTime || Date.now()).getTime(),
                             });
                         }
                    }
                }
                pageToken = results.data.nextPageToken;
                processedCount += items.length;
            } while (pageToken);
        }

        // 4. Agrupar duplicados exactos
        const groups: Record<string, any[]> = {};
        for (const file of allFiles) {
            const key = `${file.name}_${file.md5}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(file);
        }

        const duplicates: any[] = [];
        for (const key in groups) {
            if (groups[key].length >= 2) {
                // Ordenar para que el MÁS ANTIGUO quede de primero
                const fileList = groups[key].sort((a, b) => a.createdTime - b.createdTime);
                duplicates.push(fileList);
            }
        }

        // 5. Procesamiento (Modo Preview vs Modo Delete)
        let totalDeleted = 0;
        let spaceSaved = 0;
        const details: any[] = [];

        for (const group of duplicates) {
            const original = group[0];
            const duplicateFiles = group.slice(1);

            for (const dup of duplicateFiles) {
                if (runMode === 'delete') {
                    // SE MUEVE A LA PAPELERA
                    await drive.files.update({
                        fileId: dup.id,
                        requestBody: { trashed: true },
                        supportsAllDrives: true
                    });
                }
                totalDeleted++;
                spaceSaved += dup.size;
                details.push({
                    originalName: original.name,
                    keptId: original.id,
                    trashedId: dup.id,
                    sizeBytes: dup.size
                });
            }
        }

        return {
            status: "success",
            runMode,
            scannedFiles: allFiles.length,
            groupsFound: duplicates.length,
            duplicatesProcessed: totalDeleted,
            spaceSavedBytes: spaceSaved,
            details: details
        };

    } catch (error: any) {
        console.error("Error en drive duplicate cleaner", error);
        throw new functions.https.HttpsError('internal', 'Error procesando duplicados: ' + error.message);
    }
});

export const trashDriveFile = functions.runWith({
    timeoutSeconds: 30,
    memory: '256MB',
    secrets: ["DRIVE_SERVICE_ACCOUNT"]
}).https.onCall(async (data: { fileId: string }, context) => {
    if (!context.auth || context.auth.token.email !== 'juanvegas003@gmail.com') {
        throw new functions.https.HttpsError('permission-denied', 'No autorizado');
    }

    const serviceAccountValue = process.env.DRIVE_SERVICE_ACCOUNT || "";
    if (!serviceAccountValue) {
        throw new functions.https.HttpsError('failed-precondition', 'La cuenta de servicio de Drive no está configurada.');
    }

    const serviceAccount = JSON.parse(serviceAccountValue);
    const auth = new google.auth.JWT(
        serviceAccount.client_email,
        undefined,
        serviceAccount.private_key,
        ["https://www.googleapis.com/auth/drive"]
    );
    const drive = google.drive({ version: "v3", auth });

    try {
        await drive.files.update({
            fileId: data.fileId,
            requestBody: { trashed: true }
        });
        return { success: true, fileId: data.fileId };
    } catch (err: any) {
        console.error("Error trashing file", err);
        throw new functions.https.HttpsError('internal', 'Error borrando archivo: ' + err.message);
    }
});
