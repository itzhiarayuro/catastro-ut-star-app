const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function restorePenaNegra() {
    const docId = 'CACHIPAY - PENA NEGRA_PZ011_1774128027844';
    console.log(`Restaurando ${docId} a la colección activa...`);
    
    const histRef = db.collection('historial_marcaciones').doc(docId);
    const doc = await histRef.get();

    if (!doc.exists) {
        console.log("No se encontró el documento de Peña Negra.");
        return;
    }

    const data = doc.data();
    // Quitamos el timestamp para el ID activo
    const targetId = 'CACHIPAY - PENA NEGRA_PZ011';
    
    await db.collection('fichas').doc(targetId).set(data);
    console.log(`Restauración exitosa: ${targetId} ahora está activo en 'fichas'.`);
}

restorePenaNegra().catch(console.error);
