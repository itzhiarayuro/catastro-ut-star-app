const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkCollectionsComprehensively() {
  const collections = ['fichas', 'historial_fichas', 'fichas_disenos'];
  for (const collName of collections) {
    console.log(`Buscando exhaustivamente en "${collName}"...`);
    const snapshot = await db.collection(collName).get();
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const pozo = String(data.pozo || '');
      if (pozo.toLowerCase().includes('ppz')) {
        console.log(`[${collName}] ID: ${doc.id} | pozo: ${pozo}`);
        count++;
      }
    });
    console.log(`Terminado "${collName}". Total relevantes encontrados: ${count}`);
  }
}


checkCollectionsComprehensively().catch(console.error);

