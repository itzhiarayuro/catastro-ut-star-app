const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function checkCollections() {
  const collections = ['fichas', 'marcaciones', 'fichas_disenos', 'historial_fichas', 'historial_marcaciones'];
  
  const results = [];
  
  for (const collName of collections) {
    const collRef = db.collection(collName);
    const snapshot = await collRef.get();
    
    let collMatches = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const path = doc.ref.path;
      const pozo = data.pozo || data.idPozo || '';
      const idPozoDoc = data.idPozoDoc || '';
      
      const p = path.toUpperCase();
      const pz = String(pozo).toUpperCase();
      const pzd = String(idPozoDoc).toUpperCase();
      
      const isBadPath = p.includes('PPZ') || p.includes('PZZ');
      const isBadPozo = pz.startsWith('PPZ') || pz.startsWith('PZZ');
      const isBadPozoDoc = pzd.includes('PPZ') || pzd.includes('PZZ');
      
      if (isBadPath || isBadPozo || isBadPozoDoc) {
        results.push({
            collection: collName,
            id: doc.id,
            pozo: pozo,
            idPozoDoc: idPozoDoc
        });
        collMatches++;
      }
    });
    console.log(`Checked collection '${collName}': ${snapshot.size} documents, ${collMatches} matches found.`);
  }
  
  console.log("\nDetails of matches:");
  console.log(JSON.stringify(results, null, 2));
}

checkCollections().catch(console.error);
