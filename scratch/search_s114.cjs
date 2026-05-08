const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function searchS114() {
  console.log("Searching for 'SOPO_S114' in collection 'marcaciones'...");
  const snapshot = await db.collection('marcaciones').get();
  let found = false;

  snapshot.forEach(doc => {
    const data = doc.data();
    const dataString = JSON.stringify(data).toUpperCase();
    const idString = doc.id.toUpperCase();

    if (idString.includes('SOPO_S114') || dataString.includes('SOPO_S114')) {
      console.log(`\nMatch found! Document ID: ${doc.id}`);
      console.log(`Municipality: ${data.municipio || data.MUNICIPIO || 'Not specified in this field'}`);
      console.log('Full data:', JSON.stringify(data, null, 2));
      found = true;
    }
  });

  if (!found) {
    console.log("\nNo document containing 'S114' was found in 'marcaciones'.");
    
    // Also checking 'fichas' just in case, as the user might be referring to the main collection
    console.log("\nChecking 'fichas' collection as fallback...");
    const fichasSnapshot = await db.collection('fichas').get();
    fichasSnapshot.forEach(doc => {
        const data = doc.data();
        const dataString = JSON.stringify(data).toUpperCase();
        const idString = doc.id.toUpperCase();
    
        if (idString.includes('SOPO_S114') || dataString.includes('SOPO_S114')) {
          console.log(`\nMatch found in 'fichas'! Document ID: ${doc.id}`);
          console.log(`Municipality: ${data.municipio || data.MUNICIPIO || 'Not specified in this field'}`);
          console.log('Full data:', JSON.stringify(data, null, 2));
          found = true;
        }
      });
  }
}

searchS114().catch(console.error);
