const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function getQuickOrphans() {
    const snapshot = await db.collection('marcaciones').offset(100).limit(100).get();
    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.createdBy) {
            console.log(`ORPHAN FOUND -> POZO: ${data.pozo || data.header?.pozoNo || 'S/N'} | MUNICIPIO: ${data.municipio || data.header?.municipio || 'N/A'} | ID: ${doc.id}`);
            count++;
            if (count >= 3) process.exit(0);
        }
    });
}

getQuickOrphans().catch(console.error);
