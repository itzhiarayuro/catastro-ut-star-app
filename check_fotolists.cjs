const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function auditFotoLists() {
  const snapshot = await db.collection('fichas').get();

  let total = 0;
  let sinFotos = 0;
  let soloUna = 0;
  let incompletas = []; // fotoList < 3 (falta T, I, o L)

  snapshot.forEach(doc => {
    total++;
    const d = doc.data();
    const fotoList = d.fotoList || [];
    const count = fotoList.length;
    const subcats = fotoList.map(f => f.subcategoria || '');

    const tieneP = subcats.some(s => s === 'P');
    const tieneT = subcats.some(s => s === 'T');
    const tieneI = subcats.some(s => s === 'I');

    if (count === 0) sinFotos++;
    if (count === 1) soloUna++;

    if (!tieneT || !tieneI) {
      incompletas.push({
        id: doc.id,
        pozo: d.pozo || d.idPozo || '?',
        municipio: d.municipio || '?',
        totalFotos: count,
        tieneP, tieneT, tieneI,
        subcats: subcats.join(', ')
      });
    }
  });

  console.log(`\n===== AUDITORÍA fotoList =====`);
  console.log(`Total fichas:         ${total}`);
  console.log(`Sin ninguna foto:     ${sinFotos}`);
  console.log(`Con solo 1 foto:      ${soloUna}`);
  console.log(`Faltan T o I (incompletas): ${incompletas.length}`);
  console.log(`\n--- Detalle (primeras 30) ---`);
  incompletas.slice(0, 30).forEach(f => {
    console.log(`  ${f.municipio.padEnd(10)} | ${f.pozo.padEnd(8)} | fotos:${f.totalFotos} | P:${f.tieneP?'✅':'❌'} T:${f.tieneT?'✅':'❌'} I:${f.tieneI?'✅':'❌'} | [${f.subcats}]`);
  });
  if (incompletas.length > 30) {
    console.log(`  ... y ${incompletas.length - 30} más`);
  }
}

auditFotoLists().catch(console.error);
