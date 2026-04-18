const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkDataConsistency() {
  console.log("Analyzing 'fichas' collection (No Order)...");
  const stats = {};
  
  const snapshot = await db.collection('fichas').get();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const mun = data.municipio || 'UNKNOWN';
    const createdAt = data.createdAt || 'NO_CREATEDAT';
    const fecha = data.fecha || 'NO_FECHA';
    
    if (!stats[mun]) {
      stats[mun] = {
        fichas: 0,
        marcaciones: 0,
        latestDates: new Set(),
        latestCreatedAt: null,
        sampleFichaIds: [],
        sampleMarcacionIds: []
      };
    }
    
    stats[mun].fichas++;
    if (stats[mun].sampleFichaIds.length < 5) {
      stats[mun].sampleFichaIds.push(doc.id);
    }
    stats[mun].latestDates.add(fecha);
    if (!stats[mun].latestCreatedAt || createdAt > stats[mun].latestCreatedAt) {
      stats[mun].latestCreatedAt = createdAt;
    }
  });
  
  console.log("Analyzing 'marcaciones' collection (No Order)...");
  const marcSnapshot = await db.collection('marcaciones').get();
  
  marcSnapshot.forEach(doc => {
    const data = doc.data();
    const mun = data.municipio || 'UNKNOWN';
    const createdAt = data.createdAt || 'NO_CREATEDAT';
    
    if (!stats[mun]) {
      stats[mun] = {
        fichas: 0,
        marcaciones: 0,
        latestDates: new Set(),
        latestCreatedAt: null,
        sampleFichaIds: [],
        sampleMarcacionIds: []
      };
    }
    
    stats[mun].marcaciones++;
    if (stats[mun].sampleMarcacionIds.length < 5) {
      stats[mun].sampleMarcacionIds.push(doc.id);
    }
    
    if (!stats[mun].latestCreatedAt || createdAt > stats[mun].latestCreatedAt) {
      stats[mun].latestCreatedAt = createdAt;
    }
  });
  
  console.log("\n--- STATISTICS PER MUNICIPIO ---");
  Object.keys(stats).sort().forEach(mun => {
    const s = stats[mun];
    const sortedDates = Array.from(s.latestDates).sort().reverse().slice(0, 5);
    console.log(`${mun}:`);
    console.log(`  Fichas: ${s.fichas}`);
    console.log(`  Marcaciones: ${s.marcaciones}`);
    console.log(`  Sample Ficha IDs: ${s.sampleFichaIds.join(', ')}`);
    console.log(`  Sample Marcacion IDs: ${s.sampleMarcacionIds.join(', ')}`);
    console.log(`  Latest 'fecha' entries: ${sortedDates.join(', ')}`);
    console.log(`  Latest 'createdAt' in either: ${s.latestCreatedAt}`);
  });
}

checkDataConsistency().catch(err => {
    console.error("ERROR:", err);
    process.exit(1);
});
