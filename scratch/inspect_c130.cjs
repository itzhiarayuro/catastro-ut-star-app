const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/ICA2025/.gemini/antigravity/scratch/catastro-ut-star-app/scripts/clave.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspectPozo() {
    const pozoId = 'C130';
    const municipio = 'MARINILLA'; // Usually caps in this db, will check case insensitive
    
    console.log(`Buscando pozo ${pozoId} en Marinilla...`);
    
    const collections = ['fichas', 'marcaciones'];
    
    for (const collName of collections) {
        console.log(`Checking collection: ${collName}`);
        const snapshot = await db.collection(collName)
            .where('municipio', '==', municipio)
            .get();
        
        if (snapshot.empty) {
            // Try lowercase just in case
            const snapshot2 = await db.collection(collName)
                .where('municipio', '==', 'marinilla')
                .get();
            
            if (!snapshot2.empty) {
                snapshot2.forEach(doc => {
                    const data = doc.data();
                    if (JSON.stringify(data).includes(pozoId)) {
                        console.log(`MATCH FOUND in ${collName}/${doc.id}`);
                        console.log('Data:', JSON.stringify(data, null, 2));
                    }
                });
            }
        } else {
            snapshot.forEach(doc => {
                const data = doc.data();
                if (JSON.stringify(data).includes(pozoId)) {
                    console.log(`MATCH FOUND in ${collName}/${doc.id}`);
                    console.log('Data:', JSON.stringify(data, null, 2));
                }
            });
        }
    }
}

inspectPozo().catch(console.error);
