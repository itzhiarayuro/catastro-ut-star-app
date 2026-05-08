const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const photosBaseDir = 'H:\\Unidades compartidas\\ICYA\\FICHAS-EPC-PDA';

async function findOrphans() {
  const snapshot = await db.collection('fichas').get();
  const firebasePozos = new Set();
  
  snapshot.forEach(doc => {
    firebasePozos.add(doc.id.toUpperCase());
    
    const data = doc.data();
    if (data.pozo) {
        const mun = doc.id.split('_')[0].toUpperCase();
        const poz = String(data.pozo).toUpperCase();
        firebasePozos.add(`${mun}_${poz}`);
    }
  });

  console.log(`Total pozos únicos registrados en Firebase (fichas): ${firebasePozos.size}`);

  let municipiosCarpetas = [];
  try {
      municipiosCarpetas = fs.readdirSync(photosBaseDir).filter(f => fs.statSync(path.join(photosBaseDir, f)).isDirectory());
  } catch (e) {
      console.log("No se pudo leer el directorio base de fotos:", e.message);
      return;
  }

  const orphanedFolders = [];

  municipiosCarpetas.forEach(mun => {
      try {
          const catastroDir = path.join(photosBaseDir, mun, 'CATASTRO');
          if (fs.existsSync(catastroDir)) {
              const pozosDir = fs.readdirSync(catastroDir).filter(f => fs.statSync(path.join(catastroDir, f)).isDirectory());
              
              pozosDir.forEach(folder => {
                  const folderUpper = folder.toUpperCase();
                  const expectedId1 = `${mun.toUpperCase()}_${folderUpper}`;
                  const expectedId2 = `${mun.toUpperCase()}_${folderUpper.replace(/\s+/g, '')}`;
                  
                  if (!firebasePozos.has(expectedId1) && !firebasePozos.has(expectedId2)) {
                      orphanedFolders.push(`${mun.toUpperCase()} / ${folder}`);
                  }
              });
          }
      } catch (e) {}
  });

  console.log("\n--- CARPETAS LOCALES (CATASTRO) SIN REGISTRO EN FIREBASE ---");
  if (orphanedFolders.length === 0) {
      console.log("¡Excelente! Todas las carpetas locales tienen su registro en Firebase.");
  } else {
      // Agrupar por municipio para mejor legibilidad
      const grouped = {};
      orphanedFolders.forEach(item => {
          const [m, p] = item.split(' / ');
          if (!grouped[m]) grouped[m] = [];
          grouped[m].push(p);
      });
      
      for (const [m, pozos] of Object.entries(grouped)) {
          console.log(`\n📍 ${m} (${pozos.length} carpetas sin datos):`);
          pozos.forEach(p => console.log(`   - ${p}`));
      }
      
      console.log(`\nTotal carpetas huérfanas en CATASTRO: ${orphanedFolders.length}`);
  }
}

findOrphans().catch(console.error);
