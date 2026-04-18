const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkHistorialGap() {
    const snap = await db.collection('historial_fichas').get();
    const uniqueInHistorial = new Set();
    const masterIds = new Set();
    
    // Get all master IDs
    const masterSnap = await db.collection('fichas').get();
    masterSnap.docs.forEach(doc => masterIds.add(doc.id));
    
    let missingInMaster = 0;
    snap.docs.forEach(doc => {
        const id = doc.id.split('_')[0]; // Remove Date.now()
        if (!masterIds.has(id)) {
            missingInMaster++;
            uniqueInHistorial.add(id);
        }
    });

    console.log(`--- Historial vs Master Gap Analysis ---`);
    console.log(`Unique IDs in Historial but NOT in Master: ${uniqueInHistorial.size}`);
    console.log(`Examples of missing IDs:`, Array.from(uniqueInHistorial).slice(0, 10));
}

checkHistorialGap().catch(console.error);
