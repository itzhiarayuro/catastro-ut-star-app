const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateC130() {
    const docPath = 'fichas/MARINILLA_C130';
    const docRef = db.doc(docPath);
    
    console.log(`Actualizando pozo C130 en Marinilla (${docPath})...`);
    
    const updateData = {
        cargue: {
            mat: '-',
            estado: '-',
            existe: 'NO'
        }
    };
    
    await docRef.update(updateData);
    console.log('✅ Actualización de C130 completada con éxito.');
    
    // Verificar el cambio
    const updatedDoc = await docRef.get();
    console.log('Estado actual de cargue:', JSON.stringify(updatedDoc.data().cargue, null, 2));
}

updateC130().catch(console.error);
