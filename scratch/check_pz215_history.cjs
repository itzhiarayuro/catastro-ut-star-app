const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/ICA2025/.gemini/antigravity/scratch/catastro-ut-star-app/scripts/clave.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkHistory() {
    console.log('Checking historial_fichas for PZ215...');
    const snapshot = await db.collection('historial_fichas')
        .where('pozo', '==', 'PZ215')
        .get();

    if (snapshot.empty) {
        console.log('No history found for PZ215');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Document ID: ${doc.id}`);
        console.log(`- Altura: ${data.altura}`);
        console.log(`- Municipio: ${data.municipio}`);
        console.log(`- CreatedAt: ${data.createdAt}`);
        console.log(`- _path: ${data.__path__ || 'N/A'}`);
        console.log('---');
    });
}

checkHistory().catch(console.error);
