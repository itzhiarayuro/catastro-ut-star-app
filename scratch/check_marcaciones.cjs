const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function checkCollectionsAndMarcaciones() {
    console.log("--- Listando Colecciones Disponibles ---");
    const collections = await db.listCollections();
    collections.forEach(c => console.log(`- ${c.id}`));

    console.log("\n--- Buscando PZ011 en la colección 'marcaciones' ---");
    const marcRef = db.collection('marcaciones');
    const snap = await marcRef.get();
    console.log(`Total en 'marcaciones': ${snap.size}`);
    
    snap.forEach(doc => {
        if (doc.id.includes('PZ011')) {
            console.log(`Encontrado en 'marcaciones': ${doc.id}`);
        }
    });
}

checkCollectionsAndMarcaciones().catch(console.error);
