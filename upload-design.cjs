
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar admin (usa las credenciales por defecto si estás en local con firebase login)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function uploadDesign() {
    try {
        const filePath = path.join(__dirname, 'plantilla-diseño.json');

        if (!fs.existsSync(filePath)) {
            console.error(`❌ No se encontró el archivo en: ${filePath}`);
            return;
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const designData = JSON.parse(rawData);

        console.log("📤 Subiendo diseño a Firestore...");

        // Guardamos el diseño con ID 'default' o podrías usar una versión
        await db.collection('fichas_disenos').doc('default').set({
            ...designData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("✅ Diseño subido exitosamente a: fichas_disenos/default");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error al subir el diseño:", error);
        process.exit(1);
    }
}

uploadDesign();
