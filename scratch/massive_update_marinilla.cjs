const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function massiveUpdateMarinilla() {
    console.log('--- INICIANDO ACTUALIZACIÓN MASIVA EN MARINILLA ---');
    
    const snapshot = await db.collection('fichas')
        .where('municipio', '==', 'MARINILLA')
        .get();
    
    if (snapshot.empty) {
        console.log('No se encontraron pozos en MARINILLA.');
        return;
    }

    console.log(`Pozos encontrados en MARINILLA: ${snapshot.size}`);
    
    const batch = db.batch();
    let count = 0;
    
    const updateData = {
        cargue: {
            mat: '-',
            estado: '-',
            existe: 'NO'
        }
    };

    snapshot.forEach(doc => {
        const data = doc.data();
        // Solo actualizar si no es NO ya o si el objeto cargue es diferente
        if (!data.cargue || data.cargue.existe !== 'NO') {
            batch.update(doc.ref, updateData);
            console.log(`[UPDATE] Pozo: ${data.pozo || doc.id}`);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`\n✅ Se han actualizado ${count} pozos exitosamente.`);
    } else {
        console.log('\nTodos los pozos ya estaban actualizados.');
    }
}

massiveUpdateMarinilla().catch(console.error);
