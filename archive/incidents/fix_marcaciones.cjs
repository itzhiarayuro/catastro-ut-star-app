const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function fixMarcaciones() {
    console.log("Buscando PZ011 en 'marcaciones'...");
    
    // IDs que queremos asegurar que estén en marcaciones
    const targets = [
        'CACHIPAY - SAN MATEO_PZ011',
        'CACHIPAY - PENA NEGRA_PZ011'
    ];

    for (const id of targets) {
        const marcRef = db.collection('marcaciones').doc(id);
        const marcDoc = await marcRef.get();

        if (!marcDoc.exists) {
            console.log(`FALTA: ${id} en 'marcaciones'. Intentando restaurar desde el historial...`);
            
            // Buscamos en historial_marcaciones (que es de donde vienen estos datos)
            const histSnapshot = await db.collection('historial_marcaciones')
                .where(admin.firestore.FieldPath.documentId(), '>=', id)
                .where(admin.firestore.FieldPath.documentId(), '<', id + '\uf8ff')
                .limit(1)
                .get();

            if (!histSnapshot.empty) {
                const data = histSnapshot.docs[0].data();
                await marcRef.set(data);
                console.log(`RESTAURADO: ${id} en la colección 'marcaciones'.`);
            } else {
                console.log(`ERROR: No se encontró respaldo para ${id} en 'historial_marcaciones'.`);
            }
        } else {
            console.log(`YA EXISTE: ${id} ya está en 'marcaciones'.`);
        }
    }
}

fixMarcaciones().catch(console.error);
