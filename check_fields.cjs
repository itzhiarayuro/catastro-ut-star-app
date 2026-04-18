const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkFields() {
    const snap = await db.collection('fichas').get();
    let missingLastSync = 0;
    let missingMuni = 0;
    let missingPozo = 0;

    snap.docs.forEach(doc => {
        const d = doc.data();
        if (!d.lastSync) missingLastSync++;
        if (!d.municipio) missingMuni++;
        if (!d.pozo) missingPozo++;
    });

    console.log(`--- Field Validation Report ---`);
    console.log(`Total Docs: ${snap.size}`);
    console.log(`Missing lastSync: ${missingLastSync}`);
    console.log(`Missing municipio: ${missingMuni}`);
    console.log(`Missing pozo: ${missingPozo}`);
    
    if (missingLastSync > 0) {
        console.log('Fichas missing lastSync (HIDDEN FROM FichasViewer!):');
        snap.docs.filter(doc => !doc.data().lastSync).slice(0, 5).forEach(doc => {
           console.log(`- ID: ${doc.id}, Mun: ${doc.data().municipio}`);
        });
    }
}

checkFields().catch(console.error);
