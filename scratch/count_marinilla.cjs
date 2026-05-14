const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function countMarinilla() {
    const snapshot = await db.collection('fichas')
        .where('municipio', '==', 'MARINILLA')
        .get();
    
    console.log(`Total de pozos en MARINILLA: ${snapshot.size}`);
    
    let yaEstanBien = 0;
    let paraCambiar = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.cargue && data.cargue.existe === 'NO') {
            yaEstanBien++;
        } else {
            paraCambiar++;
        }
    });
    
    console.log(`- Ya tienen 'Existe Cargue: NO': ${yaEstanBien}`);
    console.log(`- Pendientes por actualizar: ${paraCambiar}`);
}

countMarinilla().catch(console.error);
