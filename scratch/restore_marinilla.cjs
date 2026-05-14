const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function restoreMarinilla() {
    console.log('--- INICIANDO RESTAURACIÓN DESDE EL HISTORIAL (MARINILLA) ---');
    
    // 1. Obtener todas las fichas de Marinilla actuales (las que están "borradas")
    const fichasSnap = await db.collection('fichas')
        .where('municipio', '==', 'MARINILLA')
        .get();
        
    console.log(`Fichas encontradas para procesar: ${fichasSnap.size}`);
    
    const batch = db.batch();
    let count = 0;

    for (const doc of fichasSnap.docs) {
        const pozoId = doc.data().pozo;
        
        // 2. Buscar en el historial todas las versiones de este pozo
        const histSnap = await db.collection('historial_fichas')
            .where('pozo', '==', pozoId)
            .where('municipio', '==', 'MARINILLA')
            .get();

        if (!histSnap.empty) {
            // Ordenar por versionId descendente en memoria
            const versions = histSnap.docs.map(d => d.data())
                .sort((a, b) => (b.versionId || 0) - (a.versionId || 0));
            
            let originalData = null;
            
            for (const hData of versions) {
                // Si la tapa NO es "SIN TAPA", esta es una versión con datos reales
                if (hData.tapa && hData.tapa.estado !== 'SIN TAPA') {
                    originalData = hData;
                    break;
                }
            }

            if (originalData) {
                batch.update(doc.ref, {
                    tapa: originalData.tapa,
                    cono: originalData.cono,
                    cilindro: originalData.cilindro || { existe: 'DESCONOCIDO', mat: '', estado: 'DESCONOCIDO' },
                    canu: originalData.canu,
                    peld: originalData.peld,
                    cargue: originalData.cargue,
                    diam: originalData.diam,
                    lastSync: new Date().toISOString(),
                    restoredAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[RESTORED] Pozo: ${pozoId}`);
                count++;
            }
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`\n✅ Se han restaurado ${count} fichas exitosamente.`);
    } else {
        console.log('\nNo se encontraron versiones previas válidas para restaurar.');
    }
}

restoreMarinilla().catch(console.error);
