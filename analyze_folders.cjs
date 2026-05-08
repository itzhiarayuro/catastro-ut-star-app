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

async function analyze() {
  const snapshot = await db.collection('fichas').get();
  const pozosToRename = []; 
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const id = doc.id;
    let pozo = data.pozo || '';
    if (typeof pozo !== 'string') pozo = String(pozo);
    
    let newPozo = null;
    if (/^PZC/i.test(pozo)) newPozo = pozo.replace(/^PZC/i, 'C');
    else if (/^PZPZ/i.test(pozo)) newPozo = pozo.replace(/^PZPZ/i, 'PZ');
    
    if (newPozo && newPozo !== pozo) {
      const municipio = id.split('_')[0];
      pozosToRename.push({ id, municipio, oldPozo: pozo, newPozo });
    }
  });

  const carpetasMap = {};
  try {
      const municipiosCarpetas = fs.readdirSync(photosBaseDir).filter(f => fs.statSync(path.join(photosBaseDir, f)).isDirectory());
      municipiosCarpetas.forEach(mun => {
          try {
              const catastroDir = path.join(photosBaseDir, mun, 'CATASTRO');
              if (fs.existsSync(catastroDir)) {
                  const pozosDir = fs.readdirSync(catastroDir).filter(f => fs.statSync(path.join(catastroDir, f)).isDirectory());
                  carpetasMap[mun.toUpperCase()] = pozosDir;
              }
          } catch (e) {}
      });
  } catch (e) {
      console.log("Error leyendo directorio base.");
  }

  console.log("Estado real de carpetas en CATASTRO:");
  pozosToRename.forEach(p => {
      const munUpper = p.municipio.toUpperCase();
      const carpetasMun = carpetasMap[munUpper] || [];
      
      const exactOld = carpetasMun.find(c => c.toUpperCase() === p.oldPozo.toUpperCase());
      const exactNew = carpetasMun.find(c => c.toUpperCase() === p.newPozo.toUpperCase());
      
      let status = "";
      if (exactOld) {
          status = `TIENE CARPETA (con el nombre viejo: ${exactOld})`;
      } else if (exactNew) {
          status = `TIENE CARPETA (ya tiene el nombre corregido: ${exactNew})`;
      } else {
          const similar = carpetasMun.find(c => c.toUpperCase().includes(p.oldPozo.toUpperCase()) || c.toUpperCase().includes(p.newPozo.toUpperCase()) || p.oldPozo.toUpperCase().includes(c.toUpperCase()));
          if (similar) {
              status = `ROTA/SIMILAR (se encontró "${similar}" en vez de ${p.oldPozo})`;
          } else {
              status = `NO TIENE CARPETA (no se encontró nada similar)`;
          }
      }
      console.log(`- ${p.municipio}: ${p.oldPozo} -> ${p.newPozo} | ${status}`);
  });
}

analyze().catch(console.error);
