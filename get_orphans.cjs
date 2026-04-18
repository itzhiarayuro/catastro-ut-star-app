const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function getOrphanedExamples() {
    console.log('--- Buscando ejemplos de marcaciones sin createdBy ---');
    const snapshot = await db.collection('marcaciones').get();
    
    let orphans = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.createdBy) {
            orphans.push({
                id: doc.id,
                pozo: data.pozo || 'S/N',
                municipio: data.municipio || 'N/A',
                createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'
            });
        }
    });

    console.log(`Total huérfanos encontrados: ${orphans.length}`);
    console.log('\n--- 3 EJEMPLOS DE POZOS HUÉRFANOS ---');
    orphans.slice(0, 3).forEach((o, i) => {
        console.log(`${i+1}. POZO: ${o.pozo} | MUNICIPIO: ${o.municipio} | FECHA: ${o.createdAt} | ID Doc: ${o.id}`);
    });
}

getOrphanedExamples().catch(console.error);
