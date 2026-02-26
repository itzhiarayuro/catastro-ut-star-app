/**
 * Google Drive Sync Utility via Google Apps Script (GAS)
 * Stack 100% Gratis - No Firebase Blaze Required
 */

// Reemplaza esta URL con la que obtuviste al implementar tu Google Apps Script como App Web
export const GAS_URL = 'ESCRIBE_AQUI_TU_URL_DE_IMPLEMENTACION_GAS';

export const syncToDrive = async (foto: any, pozo: string) => {
    if (GAS_URL === 'ESCRIBE_AQUI_TU_URL_DE_IMPLEMENTACION_GAS' || !GAS_URL) {
        console.warn("⚠️ Drive Sync: URL de GAS no configurada. Las fotos se guardarán solo en Firebase.");
        return;
    }

    try {
        // Usamos mode: 'no-cors' porque GAS redirige y las peticiones POST Cross-Origin 
        // a menudo fallan silenciosamente con el contenido real, pero GAS acepta 
        // el JSON stringificado como postData.
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain', // GAS maneja mejor text/plain para evadir preflights complejas
            },
            body: JSON.stringify({
                pozo: pozo,
                filename: foto.filename,
                base64: foto.blobId,
                mimeType: 'image/jpeg'
            })
        });

        console.log(`📸 Sync: Foto [${foto.filename}] enviada a la cola de Drive.`);
        return true;
    } catch (e) {
        console.error("❌ Error en Sync Drive:", e);
        return false;
    }
};

export const syncAllPhotosToDrive = async (fotoList: any[], pozo: string) => {
    console.log(` iniciando sincronización de ${fotoList.length} fotos a Drive...`);
    const results = await Promise.all(fotoList.map(f => syncToDrive(f, pozo)));
    return results;
};
