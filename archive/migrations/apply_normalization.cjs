const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const targets = [
  { path: 'fichas/SOPO_PZ01', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ02', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ04', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ05', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ11', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ12', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ41', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ69', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ70', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ71', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_PZ200', fixPhotos: true, rename: false },
  { path: 'fichas/SOPO_P68', fixPhotos: true, rename: true },
  { path: 'fichas/SOPO_PP01', fixPhotos: true, rename: true },
  { path: 'fichas/GRANADA_P208', fixPhotos: false, rename: true },
  { path: 'fichas/GRANADA_P273', fixPhotos: false, rename: true },
  { path: 'fichas/GRANADA_PP265', fixPhotos: false, rename: true },
  { path: 'fichas/SOPO_P238', fixPhotos: false, rename: true },
  { path: 'fichas/SOPO_P241', fixPhotos: false, rename: true },
  { path: 'fichas/SOPO_P245', fixPhotos: false, rename: true },
  { path: 'fichas/SOPO_P59', fixPhotos: false, rename: true },
  { path: 'fichas/SOPO_P60', fixPhotos: false, rename: true }
];

function normalizeId(id) {
  if (!id) return id;
  if (/^PP\d+$/.test(id)) return id.replace('PP', 'PZ');
  if (/^P\d+$/.test(id)) return id.replace('P', 'PZ');
  return id;
}

async function run() {
  const batch = db.batch();
  const logs = [];

  for (const target of targets) {
    const docRef = db.doc(target.path);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logs.push(`[SKIP] Not found: ${target.path}`);
      continue;
    }

    const data = docSnap.data();
    const oldId = data.pozo;
    const newId = normalizeId(oldId);
    
    // 1. Prepare updated data
    const updatedData = { ...data };
    updatedData.pozo = newId;

    // Fix fotoList
    if (Array.isArray(updatedData.fotoList)) {
      updatedData.fotoList = updatedData.fotoList.map(foto => {
        const newFoto = { ...foto };
        if (newFoto.idPozo) newFoto.idPozo = normalizeId(newFoto.idPozo);
        if (newFoto.pozoId) newFoto.pozoId = normalizeId(newFoto.pozoId);
        if (newFoto.filename && /^(P|PP)\d+/.test(newFoto.filename)) {
           newFoto.filename = newFoto.filename.replace(/^PP?/, 'PZ');
        }
        return newFoto;
      });
    }

    // 2. Create history entry
    const timestamp = Date.now();
    const historyId = `${data.municipio || 'UNKNOWN'}_${newId}_${timestamp}`;
    const historyRef = db.collection('historial_fichas').doc(historyId);
    const historyData = {
      ...updatedData,
      tipoRegistro: 'HISTORIAL',
      versionId: timestamp,
      normalizationLog: `Bulk normalization from ${oldId} to ${newId}`
    };
    batch.set(historyRef, historyData);

    // 3. Handle document move/update
    if (target.rename || oldId !== newId) {
      const municipio = data.municipio || 'UNKNOWN';
      const newPath = `fichas/${municipio.toUpperCase()}_${newId}`;
      const newDocRef = db.doc(newPath);
      
      batch.set(newDocRef, updatedData);
      if (newPath !== target.path) {
        batch.delete(docRef);
      }
      logs.push(`[MOVE] ${target.path} -> ${newPath} (ID: ${oldId} -> ${newId})`);
    } else {
      batch.update(docRef, updatedData);
      logs.push(`[UPDATE] ${target.path} (Photos normalized)`);
    }
  }

  await batch.commit();
  console.log('--- LOGS ---');
  logs.forEach(l => console.log(l));
  console.log('--- DONE ---');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
