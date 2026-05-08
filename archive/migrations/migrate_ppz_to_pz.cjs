const admin = require('firebase-admin');
const path = require('path');

// Reference the local service account file
const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateCollection(collectionName) {
  console.log(`\n🚀 Inciando migración en colección: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  console.log(`Documentos encontrados: ${snapshot.size}`);

  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const oldId = doc.id;
    const data = doc.data();
    const dataStr = JSON.stringify(data);

    const idHasPPZ = oldId.includes('PPZ');
    const dataHasPPZ = dataStr.includes('PPZ');

    if (idHasPPZ || dataHasPPZ) {
      console.log(`  🔄 Procesando ${oldId}...`);

      // 1. Reemplazar en los datos
      const newDataStr = dataStr.replace(/PPZ/g, 'PZ');
      const newData = JSON.parse(newDataStr);

      // 2. Determinar nuevo ID
      const newId = oldId.replace(/PPZ/g, 'PZ');

      // 3. Escribir nuevo documento
      await db.collection(collectionName).doc(newId).set(newData);
      
      // 4. Si el ID cambió, borrar el viejo
      if (newId !== oldId) {
        await db.collection(collectionName).doc(oldId).delete();
        console.log(`    ✅ Migrado de ${oldId} a ${newId}`);
      } else {
        console.log(`    ✅ Campos internos actualizados en ${oldId}`);
      }

      updatedCount++;
    }
  }

  console.log(`✨ Finalizado: ${updatedCount} documentos actualizados en ${collectionName}`);
}

async function runMigration() {
  try {
    const collections = ['fichas', 'historial_fichas', 'marcaciones', 'fichas_disenos'];
    for (const coll of collections) {
      await migrateCollection(coll);
    }
    console.log('\n✅ MIGRACIÓN COMPLETA EN TODAS LAS COLECCIONES');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

runMigration();
