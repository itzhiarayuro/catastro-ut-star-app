const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function massiveCleanupMarinilla() {
    console.log('--- INICIANDO LIMPIEZA MASIVA DE COMPONENTES EN MARINILLA ---');
    
    const snapshot = await db.collection('fichas')
        .where('municipio', '==', 'MARINILLA')
        .get();
    
    if (snapshot.empty) {
        console.log('No se encontraron fichas en MARINILLA.');
        return;
    }

    console.log(`Fichas encontradas en MARINILLA: ${snapshot.size}`);
    
    let batch = db.batch();
    let count = 0;
    let batchCount = 0;
    
    const updateData = {
        tapa: {
            existe: 'NO',
            mat: 'NO APLICA',
            estado: 'SIN TAPA'
        },
        cono: {
            existe: 'NO',
            tipo: 'NO APLICA',
            mat: 'NO APLICA',
            estado: 'SIN CONO'
        },
        cilindro: {
            existe: 'NO',
            mat: 'NO APLICA',
            estado: 'SIN CILINDRO'
        },
        canu: {
            existe: 'NO',
            mat: 'NO APLICA',
            estado: 'SIN CAÑUELA'
        },
        peld: {
            existe: 'NO',
            mat: 'NO APLICA',
            num: 0,
            estado: 'SIN PELDAÑOS'
        },
        cargue: {
            existe: 'NO',
            mat: 'NO APLICA',
            estado: 'SIN CARGUE'
        },
        lastSync: new Date().toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    snapshot.forEach(doc => {
        batch.update(doc.ref, updateData);
        count++;
        batchCount++;
        
        if (batchCount >= 400) {
            console.log(`Enviando lote de ${batchCount} actualizaciones...`);
            batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    });

    if (batchCount > 0) {
        await batch.commit();
        console.log(`Enviando lote final de ${batchCount} actualizaciones...`);
    }

    console.log(`\n✅ Se han actualizado ${count} fichas en MARINILLA exitosamente.`);
}

massiveCleanupMarinilla().catch(console.error);
