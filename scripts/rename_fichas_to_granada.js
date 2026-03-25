/**
 * rename_fichas_to_granada.js
 * Renombra IDs de fichas de Michell y Brayan (24-25 marzo 2026)
 * de SIBATE_*/SOPO_* a GRANADA_*
 * También actualiza referencias en historial_fichas y marcaciones.
 */

const admin = require("firebase-admin");

// Usa Application Default Credentials (firebase login ya autenticó)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "catastro-ut-star",
});

const db = admin.firestore();

// Documentos a renombrar: [oldId, newId]
const RENAMES = [
  // Michell - fecha 25/03
  ["SOPO_PPZ302",  "GRANADA_PPZ302"],
  ["SOPO_PZ280",   "GRANADA_PZ280"],
  ["SOPO_PZ281",   "GRANADA_PZ281"],
  ["SOPO_PZ282",   "GRANADA_PZ282"],
  ["SOPO_PZ283",   "GRANADA_PZ283"],
  ["SOPO_PZ284",   "GRANADA_PZ284"],
  ["SOPO_PZ285",   "GRANADA_PZ285"],
  ["SOPO_PZ299",   "GRANADA_PZ299"],
  ["SOPO_PZ300",   "GRANADA_PZ300"],
  ["SOPO_PZ301",   "GRANADA_PZ301"],
  // Brayan - fecha 24/03 - SIBATE
  ["SIBATE_PPZ238","GRANADA_PPZ238"],
  ["SIBATE_PPZ240","GRANADA_PPZ240"],
  ["SIBATE_PPZ78", "GRANADA_PPZ78"],
  ["SIBATE_PPZ79A","GRANADA_PPZ79A"],
  ["SIBATE_PZ238", "GRANADA_PZ238"],
  ["SIBATE_PZ239", "GRANADA_PZ239"],
  ["SIBATE_PZ78",  "GRANADA_PZ78"],
  ["SIBATE_PZ79A", "GRANADA_PZ79A"],
  // Brayan - fecha 24/03 - SOPO
  ["SOPO_PP265",   "GRANADA_PP265"],
  ["SOPO_PPZ241",  "GRANADA_PPZ241"],
  ["SOPO_PPZ242",  "GRANADA_PPZ242"],
  ["SOPO_PPZ243",  "GRANADA_PPZ243"],
  ["SOPO_PPZ244",  "GRANADA_PPZ244"],
  ["SOPO_PPZ245",  "GRANADA_PPZ245"],
  ["SOPO_PPZ263",  "GRANADA_PPZ263"],
  ["SOPO_PPZ264",  "GRANADA_PPZ264"],
  ["SOPO_PPZ266",  "GRANADA_PPZ266"],
  ["SOPO_PPZ267",  "GRANADA_PPZ267"],
  ["SOPO_PPZ268",  "GRANADA_PPZ268"],
  ["SOPO_PPZ277",  "GRANADA_PPZ277"],
  ["SOPO_PPZ278",  "GRANADA_PPZ278"],
  ["SOPO_PZ237",   "GRANADA_PZ237"],
  ["SOPÓ_PPZ262",  "GRANADA_PPZ262"],
];

// Colecciones donde puede haber referencias al ID de la ficha
const REF_COLLECTIONS = ["historial_fichas", "marcaciones"];
const REF_FIELD = "fichaId"; // campo que referencia el ID de la ficha

async function findAndUpdateRefs(oldId, newId) {
  for (const colName of REF_COLLECTIONS) {
    const snap = await db.collection(colName)
      .where(REF_FIELD, "==", oldId)
      .get();

    if (!snap.empty) {
      console.log(`  → Actualizando ${snap.size} refs en '${colName}' [${REF_FIELD}: ${oldId}]`);
      const batch = db.batch();
      snap.docs.forEach(d => batch.update(d.ref, { [REF_FIELD]: newId }));
      await batch.commit();
    }
  }
}

async function renameDocument(oldId, newId) {
  const oldRef = db.collection("fichas").doc(oldId);
  const newRef = db.collection("fichas").doc(newId);

  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) {
    console.warn(`  ⚠️  No encontrado: fichas/${oldId} — saltando.`);
    return;
  }

  // Verificar que el destino no exista ya
  const newSnap = await newRef.get();
  if (newSnap.exists) {
    console.warn(`  ⚠️  Ya existe fichas/${newId} — saltando para evitar sobreescritura.`);
    return;
  }

  const data = oldSnap.data();

  // Usar batch: crear nuevo + eliminar viejo atómicamente
  const batch = db.batch();
  batch.set(newRef, data);
  batch.delete(oldRef);
  await batch.commit();

  console.log(`  ✅ ${oldId} → ${newId}`);

  // Actualizar referencias
  await findAndUpdateRefs(oldId, newId);
}

async function main() {
  console.log(`\n🚀 Iniciando renombrado de ${RENAMES.length} fichas...\n`);

  let ok = 0;
  let errors = 0;

  for (const [oldId, newId] of RENAMES) {
    try {
      process.stdout.write(`[${ok + errors + 1}/${RENAMES.length}] `);
      await renameDocument(oldId, newId);
      ok++;
    } catch (err) {
      console.error(`  ❌ Error en ${oldId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Resultado: ${ok} renombrados, ${errors} errores.\n`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
