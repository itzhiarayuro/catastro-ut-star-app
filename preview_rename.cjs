const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function previewRename() {
  const collections = ['fichas', 'historial_fichas', 'fichas_disenos', 'marcaciones', 'historial_marcaciones', 'tuberias'];
  
  let totalChanges = 0;
  
  for (const collName of collections) {
    const snapshot = await db.collection(collName).get();
    
    let collChanges = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      
      let newId = id;
      let newPozo = data.pozo || null;
      let newPozo1 = data.pozo1 || null;
      let newPozo2 = data.pozo2 || null;
      
      let changed = false;
      let changes = [];
      
      // Función para reemplazar PZC -> C y PZPZ -> PZ al inicio o después de guión bajo
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
          if (updated !== newPozo) {
              changed = true;
              changes.push(`Campo 'pozo': "${newPozo}" -> "${updated}"`);
          }
      }
      
      // En fichas_disenos, hay pozo1 y pozo2 en tuberias?
      if (newPozo1 && typeof newPozo1 === 'string') {
          const updated = replacePozoPrefix(newPozo1);
          if (updated !== newPozo1) {
              changed = true;
              changes.push(`Campo 'pozo1': "${newPozo1}" -> "${updated}"`);
          }
      }
      if (newPozo2 && typeof newPozo2 === 'string') {
          const updated = replacePozoPrefix(newPozo2);
          if (updated !== newPozo2) {
              changed = true;
              changes.push(`Campo 'pozo2': "${newPozo2}" -> "${updated}"`);
          }
      }

      const updatedId = replaceIdString(id);
      if (updatedId !== id) {
          changed = true;
          changes.push(`ID Documento: "${id}" -> "${updatedId}"`);
      }

      if (changed) {
        console.log(`[${collName}]`);
        changes.forEach(c => console.log(`  - ${c}`));
        collChanges++;
        totalChanges++;
      }
    });
    
    if (collChanges > 0) {
      console.log(`Total modificados en ${collName}: ${collChanges}\n`);
    }
  }
  
  console.log(`Total de documentos a modificar en todas las colecciones: ${totalChanges}`);
}

previewRename().catch(console.error);
