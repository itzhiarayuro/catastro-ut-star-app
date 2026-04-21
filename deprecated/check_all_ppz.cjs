const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAllPPZ() {
  const collections = ['fichas', 'historial_fichas', 'fichas_disenos'];
  for (const collName of collections) {
    console.log(`Buscando PPZ en "${collName}"...`);
    const snapshot = await db.collection(collName).get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      const dataStr = JSON.stringify(data);
      if (id.includes('PPZ') || dataStr.includes('PPZ')) {
         console.log(`[${collName}] Match: ${id}`);
         // Check if it's in pozo
         if (data.pozo && data.pozo.includes('PPZ')) {
            console.log(`   POZO: ${data.pozo}`);
         }
      }
    });
  }
}

checkAllPPZ().catch(console.error);
