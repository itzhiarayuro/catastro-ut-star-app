const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function dumpDoc() {
  const doc = await db.collection('historial_fichas').doc('SOPO_P061_1772735913530').get();
  if (doc.exists) {
    console.log(JSON.stringify(doc.data(), null, 2));
  } else {
    console.log('Documento no encontrado');
  }
}

dumpDoc().catch(console.error);
