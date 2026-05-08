const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function inspectRestored() {
    const docId = 'CACHIPAY - SAN MATEO_PZ011';
    const doc = await db.collection('fichas').doc(docId).get();
    const data = doc.data();
    
    console.log(`Inspeccionando pozo restaurado (${docId}):`);
    console.log(`- Municipio: ${data.municipio}`);
    console.log(`- Vereda/Sector: ${data.vereda || data.sector}`);
    console.log(`- Pozo: ${data.pozo}`);
    console.log(`- Coordenadas: ${data.coordenada_x}, ${data.coordenada_y}`);
}

inspectRestored().catch(console.error);
