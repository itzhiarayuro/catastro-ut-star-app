const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkFichasAudit() {
  const snapshot = await db.collection('fichas').get();
  let total = 0;
  let missingCreatedBy = 0;
  
  snapshot.forEach(doc => {
    total++;
    const data = doc.data();
    if (!data.createdBy) {
      missingCreatedBy++;
    }
  });
  
  console.log(`Total Fichas: ${total}`);
  console.log(`Fichas missing 'createdBy': ${missingCreatedBy}`);
}

checkFichasAudit().catch(console.error);
