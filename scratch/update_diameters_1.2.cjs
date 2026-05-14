const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateDiameters12() {
    const pozos = [
        'CIN12E', 'CIN19J', 'CIN2', 'CIN21A', 'CIN33A', 'CIN5', 'PZ01'
    ];
    
    console.log(`Actualizando Diámetro Cilindro a 1.2 para ${pozos.length} pozos en Marinilla...`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const pozo of pozos) {
        const docId = `MARINILLA_${pozo}`;
        const docRef = db.collection('fichas').doc(docId);
        
        batch.update(docRef, { diam: 1.2 });
        console.log(`[QUEUED] ${pozo} -> diam: 1.2`);
        count++;
    }
    
    if (count > 0) {
        await batch.commit();
        console.log(`\n✅ Se han actualizado ${count} pozos con éxito.`);
    }
}

updateDiameters12().catch(console.error);
