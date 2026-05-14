const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateDiameters() {
    const pozos = [
        'C130', 'C1525B', 'CIN12A', 'CIN12C', 'CIN12D', 
        'CIN191', 'CIN19D', 'CIN27', 'CIN4', 'CIN40', 
        'M074', 'M108', 'M336', 'M337', 'M905'
    ];
    
    console.log(`Actualizando Diámetro Cilindro a 0 para ${pozos.length} pozos en Marinilla...`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const pozo of pozos) {
        const docId = `MARINILLA_${pozo}`;
        const docRef = db.collection('fichas').doc(docId);
        
        batch.update(docRef, { diam: 0 });
        console.log(`[QUEUED] ${pozo} -> diam: 0`);
        count++;
    }
    
    if (count > 0) {
        await batch.commit();
        console.log(`\n✅ Se han actualizado ${count} pozos con éxito.`);
    }
}

updateDiameters().catch(console.error);
