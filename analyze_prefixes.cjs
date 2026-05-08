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
  console.log("=== Analizando Prefijos en Firebase (Catastro / fichas) ===");
  const snapshot = await db.collection('fichas').get();
  
  const prefixes = {};
  const pozosToRename = []; // { id, municipio, oldPozo, newPozo }
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const id = doc.id;
    let pozo = data.pozo || '';
    if (typeof pozo !== 'string') pozo = String(pozo);
    
    // Extraer prefijo (letras al inicio)
    const match = pozo.match(/^([A-Za-z]+)/);
    if (match) {
      const prefix = match[1].toUpperCase();
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    } else {
      prefixes['SIN_PREFIJO_LETRA'] = (prefixes['SIN_PREFIJO_LETRA'] || 0) + 1;
    }
    
    // Identificar los que vamos a cambiar
    let newPozo = null;
    if (/^PZC/i.test(pozo)) newPozo = pozo.replace(/^PZC/i, 'C');
    else if (/^PZPZ/i.test(pozo)) newPozo = pozo.replace(/^PZPZ/i, 'PZ');
    
    if (newPozo && newPozo !== pozo) {
      // Intentar extraer el municipio del ID (ej: SIBATE_PZC120A -> SIBATE)
      const municipio = id.split('_')[0];
      pozosToRename.push({ id, municipio, oldPozo: pozo, newPozo });
    }
  });

  // Ordenar y mostrar prefijos
  console.log("\nPrefijos encontrados en 'fichas':");
  const sortedPrefixes = Object.entries(prefixes).sort((a, b) => b[1] - a[1]);
  sortedPrefixes.forEach(([prefix, count]) => {
    console.log(`  - ${prefix}: ${count} pozos`);
  });

  console.log("\n=== Verificando Carpetas de Fotos ===");
  // Leer estructura de carpetas
  let municipiosCarpetas = [];
  try {
      municipiosCarpetas = fs.readdirSync(photosBaseDir).filter(f => fs.statSync(path.join(photosBaseDir, f)).isDirectory());
  } catch (e) {
      console.log("No se pudo leer el directorio base de fotos:", e.message);
      return;
  }

  const carpetasMap = {}; // municipio -> array de carpetas de pozos
  municipiosCarpetas.forEach(mun => {
      try {
          const pozosDir = fs.readdirSync(path.join(photosBaseDir, mun)).filter(f => fs.statSync(path.join(photosBaseDir, mun, f)).isDirectory());
          carpetasMap[mun.toUpperCase()] = pozosDir;
      } catch (e) {}
  });

  console.log("\nEstado de carpetas para los pozos a renombrar:");
  pozosToRename.forEach(p => {
      const munUpper = p.municipio.toUpperCase();
      const carpetasMun = carpetasMap[munUpper] || [];
      
      // Buscar coincidencia exacta con el nombre viejo y el nuevo
      const exactOld = carpetasMun.find(c => c.toUpperCase() === p.oldPozo.toUpperCase());
      const exactNew = carpetasMun.find(c => c.toUpperCase() === p.newPozo.toUpperCase());
      
      let status = "";
      if (exactOld) {
          status = `[CARPETA EXISTE CON NOMBRE VIEJO] -> Encontrada: "${exactOld}". Habría que renombrarla a "${p.newPozo}"`;
      } else if (exactNew) {
          status = `[CARPETA YA EXISTE CON NOMBRE NUEVO] -> Encontrada: "${exactNew}". La carpeta ya está corregida.`;
      } else {
          // Buscar similares
          const similar = carpetasMun.find(c => c.toUpperCase().includes(p.oldPozo.toUpperCase()) || c.toUpperCase().includes(p.newPozo.toUpperCase()) || p.oldPozo.toUpperCase().includes(c.toUpperCase()));
          if (similar) {
              status = `[CARPETA SIMILAR ENCONTRADA] -> "${similar}". ¿Es esta?`;
          } else {
              status = `[NO HAY CARPETA] -> No se encontró carpeta para "${p.oldPozo}" ni "${p.newPozo}" en ${munUpper}`;
          }
      }
      console.log(`- ${p.municipio} | ${p.oldPozo} -> ${p.newPozo} | ${status}`);
  });
}

analyze().catch(console.error);
