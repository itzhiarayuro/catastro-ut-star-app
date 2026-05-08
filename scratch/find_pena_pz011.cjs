const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function findSpecificPenaNegra() {
    console.log("Buscando 'CACHIPAY - PENA NEGRA_PZ011' en todo el historial...");
    
    const collections = ['historial_fichas', 'historial_marcaciones'];
    
    for (const col of collections) {
        // Intentamos buscar por ID de documento que empiece por el nombre
        const snapshot = await db.collection(col)
            .where(admin.firestore.FieldPath.documentId(), '>=', 'CACHIPAY - PENA NEGRA_PZ011')
            .where(admin.firestore.FieldPath.documentId(), '<', 'CACHIPAY - PENA NEGRA_PZ011\uf8ff')
            .get();
            
        console.log(`Resultados en ${col}: ${snapshot.size}`);
        snapshot.forEach(doc => {
            console.log(`- ID: ${doc.id}`);
            console.log(`- Datos: ${JSON.stringify(doc.data())}`);
        });
    }
}

findSpecificPenaNegra().catch(console.error);
