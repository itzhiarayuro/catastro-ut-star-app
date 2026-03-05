
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'catastro-ut-star'
    });
}

const db = admin.firestore();

async function upload() {
    try {
        const data = JSON.parse(fs.readFileSync('plantilla-diseño.json', 'utf8'));
        console.log("Subiendo...");
        await db.collection('fichas_disenos').doc('default').set({
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("Subida OK");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

upload();
