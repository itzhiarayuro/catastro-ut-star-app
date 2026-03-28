const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

function findPPZ(obj, path = '') {
  let matches = [];
  if (typeof obj === 'string') {
    if (obj.toUpperCase().includes('PPZ')) matches.push(`${path}: "${obj}"`);
  } else if (Array.isArray(obj)) {
    obj.forEach((val, i) => {
      matches = matches.concat(findPPZ(val, `${path}[${i}]`));
    });
  } else if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      if (key.toUpperCase().includes('PPZ')) matches.push(`[KEY] ${currentPath}`);
      matches = matches.concat(findPPZ(obj[key], currentPath));
    });
  }
  return matches;
}

async function listPPZInFichas() {
  const collections = ['fichas', 'historial_fichas', 'fichas_disenos'];
  for (const collName of collections) {
    console.log(`Buscando en "${collName}"...`);
    const snapshot = await db.collection(collName).get();
    console.log(`Revisando ${snapshot.size} documentos...`);
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      const matches = findPPZ(data);
      const idHasPPZ = id.toUpperCase().includes('PPZ');
      
      if (idHasPPZ || matches.length > 0) {
        console.log(`Encontrado en [${collName}] - ID: ${id}`);
        if (idHasPPZ) console.log(`   ID contiene PPZ`);
        matches.forEach(m => console.log(`   Campo: ${m}`));
        count++;
      }
    });
    console.log(`Total con "PPZ" en "${collName}": ${count}`);
  }
}




listPPZInFichas().catch(console.error);

