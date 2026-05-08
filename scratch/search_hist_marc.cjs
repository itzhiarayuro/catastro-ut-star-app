const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function searchPZ011HistorialMarcaciones() {
    console.log("--- Buscando PZ011 en 'historial_marcaciones' ---");
    const ref = db.collection('historial_marcaciones');
    const snapshot = await ref.get();
    
    snapshot.forEach(doc => {
        if (doc.id.includes('PZ011')) {
            const data = doc.data();
            console.log(`ENCONTRADO: ${doc.id}`);
            console.log(`- Municipio: ${data.municipio}`);
            console.log(`- Sector: ${data.vereda || data.sector}`);
            console.log('-------------------------------------------');
        }
    });
}

searchPZ011HistorialMarcaciones().catch(console.error);
