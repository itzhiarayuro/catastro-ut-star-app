const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkMarcacionesCreatedBy() {
  const snapshot = await db.collection('marcaciones').get();
  let total = 0;
  let missingCreatedBy = 0;
  let distinctUsers = new Set();
  
  snapshot.forEach(doc => {
    total++;
    const data = doc.data();
    if (!data.createdBy) {
      missingCreatedBy++;
    } else {
      distinctUsers.add(data.createdBy);
    }
  });
  
  console.log(`Total Marcaciones: ${total}`);
  console.log(`Marcaciones missing 'createdBy': ${missingCreatedBy}`);
  console.log(`Distinct User IDs in Marcaciones: ${distinctUsers.size}`);
  distinctUsers.forEach(uid => console.log(` - ${uid}`));
}

checkMarcacionesCreatedBy().catch(console.error);
