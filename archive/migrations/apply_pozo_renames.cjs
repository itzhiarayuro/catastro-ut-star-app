const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function applyRename() {
  const collections = ['fichas', 'historial_fichas', 'fichas_disenos', 'tuberias', 'fotos'];
  
  let totalChanges = 0;
  
  for (const collName of collections) {
    console.log(`\nProcesando colección: ${collName}...`);
    const snapshot = await db.collection(collName).get();
    
    let collChanges = 0;
    const batches = [];
    let currentBatch = db.batch();
    let opCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      
      let newPozo = data.pozo || null;
      let newPozo1 = data.pozo1 || null;
      let newPozo2 = data.pozo2 || null;
      
      let changed = false;
      
      const replacePozoPrefix = (str) => {
          if (!str) return str;
          let s = str;
          if (/^PZC/i.test(s)) s = s.replace(/^PZC/i, 'C');
          else if (/^PZPZ/i.test(s)) s = s.replace(/^PZPZ/i, 'PZ');
          return s;
      };

      const replaceIdString = (str) => {
          if (!str) return str;
          let s = str;
          if (/_PZC/i.test(s)) s = s.replace(/_PZC/i, '_C');
          else if (/_PZPZ/i.test(s)) s = s.replace(/_PZPZ/i, '_PZ');
          else if (/^PZC/i.test(s)) s = s.replace(/^PZC/i, 'C');
          else if (/^PZPZ/i.test(s)) s = s.replace(/^PZPZ/i, 'PZ');
          return s;
      };

      if (newPozo && typeof newPozo === 'string') {
          const updated = replacePozoPrefix(newPozo);
          if (updated !== newPozo) { data.pozo = updated; changed = true; }
      }
      if (newPozo1 && typeof newPozo1 === 'string') {
          const updated = replacePozoPrefix(newPozo1);
          if (updated !== newPozo1) { data.pozo1 = updated; changed = true; }
      }
      if (newPozo2 && typeof newPozo2 === 'string') {
          const updated = replacePozoPrefix(newPozo2);
          if (updated !== newPozo2) { data.pozo2 = updated; changed = true; }
      }

      // Fix also name/codigo field if present
      if (data.nombre && typeof data.nombre === 'string') {
          const updatedNombre = replacePozoPrefix(data.nombre);
          if (updatedNombre !== data.nombre) { data.nombre = updatedNombre; changed = true; }
      }
      if (data.codigo && typeof data.codigo === 'string') {
          const updatedCodigo = replacePozoPrefix(data.codigo);
          if (updatedCodigo !== data.codigo) { data.codigo = updatedCodigo; changed = true; }
      }

      const updatedId = replaceIdString(id);
      if (updatedId !== id) {
          changed = true;
      }

      if (changed) {
        const oldRef = db.collection(collName).doc(id);
        const newRef = db.collection(collName).doc(updatedId);
        
        currentBatch.set(newRef, data);
        if (updatedId !== id) {
            currentBatch.delete(oldRef);
        }
        
        opCount += (updatedId !== id) ? 2 : 1;
        collChanges++;
        totalChanges++;
        
        console.log(`[${collName}] Planificado: ${id} -> ${updatedId}`);

        if (opCount >= 400) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            opCount = 0;
        }
      }
    });
    
    if (opCount > 0) {
        batches.push(currentBatch);
    }

    // Ejecutar batches
    for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        console.log(`  - Commit batch ${i + 1}/${batches.length} en ${collName}`);
    }
    
    if (collChanges > 0) {
      console.log(`Total modificados en ${collName}: ${collChanges}`);
    } else {
      console.log(`No hubo cambios en ${collName}`);
    }
  }
  
  console.log(`\n¡Migración completada! Total de documentos modificados: ${totalChanges}`);
}

applyRename().catch(console.error);
