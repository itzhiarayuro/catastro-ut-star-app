const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function fixPena() {
    const fullId = 'CACHIPAY - PENA NEGRA_PZ011_1774128027844';
    const shortId = 'CACHIPAY - PENA NEGRA_PZ011';
    
    const histDoc = await db.collection('historial_marcaciones').doc(fullId).get();

    if (histDoc.exists) {
        const data = histDoc.data();
        data.tipoRegistro = 'MARCACION'; 
        await db.collection('marcaciones').doc(fullId).set(data);
        await db.collection('marcaciones').doc(shortId).set(data);
        console.log("Peña Negra PZ011 actualizado en 'marcaciones'.");
    }
}

fixPena().catch(console.error);
