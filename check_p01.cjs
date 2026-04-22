const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    const snap = await db.collection('fichas').where('pozo', '==', 'P01').where('municipio', '==', 'SOPO').get();
    if (snap.empty) {
        console.log('No se encontró P01 en SOPO. Buscando por ID...');
        const snap2 = await db.collection('fichas').get();
        snap2.docs.filter(d => (d.data().pozo || '').toUpperCase().includes('P01')).forEach(doc => {
            const d = doc.data();
            console.log(`\nID: ${doc.id}`);
            console.log(`  pozo: ${d.pozo}  municipio: ${d.municipio}`);
            console.log(`  coordenada_x: ${d.coordenada_x}  (tipo: ${typeof d.coordenada_x})`);
            console.log(`  coordenada_y: ${d.coordenada_y}  (tipo: ${typeof d.coordenada_y})`);
            console.log(`  gps: ${JSON.stringify(d.gps)}`);
        });
    } else {
        snap.docs.forEach(doc => {
            const d = doc.data();
            console.log(`\nID: ${doc.id}`);
            console.log(`  pozo: ${d.pozo}  municipio: ${d.municipio}`);
            console.log(`  coordenada_x: ${d.coordenada_x}  (tipo: ${typeof d.coordenada_x})`);
            console.log(`  coordenada_y: ${d.coordenada_y}  (tipo: ${typeof d.coordenada_y})`);
            console.log(`  gps: ${JSON.stringify(d.gps)}`);
        });
    }
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
