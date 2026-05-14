const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixMarinillaFinal() {
    const ids0 = ['C130', 'C1525B', 'CIN12A', 'CIN12C', 'CIN12D', 'CIN191', 'CIN19D', 'CIN27', 'CIN4', 'CIN40', 'M074', 'M108', 'M336', 'M337', 'M905'];
    
    const batch = db.batch();
    let count = 0;

    for (const id of ids0) {
        const docRef = db.collection('fichas').doc(`MARINILLA_${id}`);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            const update = {
                diam: 0,
                diametro: 0, // Sincronizamos ambos campos
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Si la cañuela o peldaños son desconocidos, los ponemos como "NO APLICA" 
            // para evitar los guiones "-" en el PDF
            if (data.canu && (data.canu.existe === 'DESCONOCIDO' || !data.canu.mat)) {
                update.canu = { existe: 'NO', mat: 'NO APLICA', estado: 'NO APLICA' };
            }
            if (data.peld && (data.peld.existe === 'DESCONOCIDO' || data.peld.num === 0)) {
                update.peld = { existe: 'NO', mat: 'NO APLICA', num: 0, estado: 'NO APLICA' };
            }
            if (data.cilindro && data.cilindro.existe === 'DESCONOCIDO') {
                update.cilindro = { existe: 'NO', mat: 'NO APLICA', estado: 'NO APLICA' };
            }

            batch.update(docRef, update);
            console.log(`[FIXED] ${id} -> diam:0, diametro:0, canu/peld cleaned`);
            count++;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`\n✅ Se han corregido ${count} pozos con éxito.`);
    } else {
        console.log('No se encontraron pozos para actualizar.');
    }
}

fixMarinillaFinal().catch(console.error);
