const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkHistorial() {
    const snap = await db.collection('historial_fichas').get();
    console.log(`Total records in historial_fichas: ${snap.size}`);
}

checkHistorial().catch(console.error);
