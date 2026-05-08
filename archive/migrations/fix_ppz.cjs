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
const baseDir = 'H:\\\\Unidades compartidas\\\\ICYA\\\\FICHAS-EPC-PDA';

async function fixPPZ() {
  const renames = [
    { mun: 'GRANADA', oldPozo: 'PPZ269', newPozo: 'PZ269' },
    { mun: 'SOPO', oldPozo: 'PPZ08', newPozo: 'PZ08' }
  ];

  for (const item of renames) {
    const oldId = `${item.mun}_${item.oldPozo}`;
    const newId = `${item.mun}_${item.newPozo}`;
    
    console.log(`\nProcesando ${oldId} -> ${newId}...`);

    // 1. Firebase Rename
    const docRef = db.collection('fichas').doc(oldId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
        const data = docSnap.data();
        data.pozo = item.newPozo;
        
        // Copiar a nuevo ID y borrar viejo
        await db.collection('fichas').doc(newId).set(data);
        await docRef.delete();
        console.log(`[FIREBASE] Migrado documento a ${newId}`);
    } else {
        console.log(`[FIREBASE] El documento ${oldId} no existe. Saltando.`);
    }

    // 2. Local Folder Rename
    const catastroDir = path.join(baseDir, item.mun, 'CATASTRO');
    const oldPath = path.join(catastroDir, item.oldPozo);
    const newPath = path.join(catastroDir, item.newPozo);

    if (fs.existsSync(oldPath)) {
        // Rename files inside first
        const files = fs.readdirSync(oldPath);
        files.forEach(f => {
            if (f.toUpperCase().startsWith(item.oldPozo)) {
                const newFileName = f.replace(new RegExp(item.oldPozo, 'i'), item.newPozo);
                fs.renameSync(path.join(oldPath, f), path.join(oldPath, newFileName));
            }
        });
        
        fs.renameSync(oldPath, newPath);
        console.log(`[LOCAL] Carpeta y archivos renombrados en ${item.mun}`);
    } else {
        console.log(`[LOCAL] La carpeta ${item.oldPozo} no existe localmente.`);
    }
  }
}

fixPPZ().then(() => console.log("\nProceso PPZ -> PZ finalizado.")).catch(console.error);
