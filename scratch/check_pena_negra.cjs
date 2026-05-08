const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function findPenaNegra() {
    console.log("--- Buscando rastro de 'PEÑA NEGRA' o 'PENA NEGRA' ---");
    const collections = ['fichas', 'historial_fichas'];
    
    for (const col of collections) {
        const ref = db.collection(col);
        const snapshot = await ref.get();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const fullText = JSON.stringify(data).toUpperCase();
            const idDoc = doc.id.toUpperCase();

            if (fullText.includes('PEÑA NEGRA') || fullText.includes('PENA NEGRA') || idDoc.includes('PEÑA') || idDoc.includes('PENA')) {
                console.log(`MATCH en ${col}:`);
                console.log(`- ID Documento: ${doc.id}`);
                console.log(`- Municipio/Sector: ${data.municipio} / ${data.vereda || data.sector}`);
                console.log(`- Pozo: ${data.pozo}`);
                console.log('-------------------------------------------');
            }
        });
    }
}

findPenaNegra().catch(console.error);
