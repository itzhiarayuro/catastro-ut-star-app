const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkTotalCount() {
    const snap = await db.collection('fichas').get();
    console.log(`--- Firestore Total Stats ---`);
    console.log(`Total Fichas: ${snap.size}`);
    
    const countByMuni = {};
    snap.docs.forEach(doc => {
        const m = doc.data().municipio || 'N/A';
        countByMuni[m] = (countByMuni[m] || 0) + 1;
    });
    
    console.table(countByMuni);
}

checkTotalCount().catch(console.error);
