const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkCollections() {
  const collections = ['fichas', 'historial_fichas'];
  for (const collName of collections) {
    console.log(`Buscando en "${collName}"...`);
    const snapshot = await db.collection(collName).get();
    let found = false;
    snapshot.forEach(doc => {
      const data = doc.data();
      const pozo = String(data.pozo || '');
      if (pozo.toLowerCase().includes('ppz')) {
        console.log(`[${collName}] ID: ${doc.id} | pozo: ${pozo}`);
        found = true;
      }
    });
    if (!found) {
      console.log(`No se encontraron en "${collName}" con "ppz" en el campo "pozo" (ignora mayúsculas/minúsculas).`);
    }
  }
}

checkCollections().catch(console.error);

