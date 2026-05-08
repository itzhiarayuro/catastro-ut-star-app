const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function forceRestoreAndVerify() {
    console.log("--- Verificando contenido de 'marcaciones' ---");
    const marcSnap = await db.collection('marcaciones').get();
    let found = false;
    marcSnap.forEach(doc => {
        if (doc.id.includes('PZ011')) {
            console.log(`Documento presente en 'marcaciones': ${doc.id}`);
            found = true;
        }
    });
    if (!found) console.log("No se encontró ningún PZ011 en 'marcaciones'.");

    console.log("\n--- Forzando restauración con ID completo ---");
    const fullId = 'CACHIPAY - SAN MATEO_PZ011_1774199416125';
    const histDoc = await db.collection('historial_marcaciones').doc(fullId).get();

    if (histDoc.exists) {
        const data = histDoc.data();
        // Intentamos restaurar con ambos IDs para asegurar visibilidad
        await db.collection('marcaciones').doc(fullId).set(data);
        await db.collection('marcaciones').doc('CACHIPAY - SAN MATEO_PZ011').set(data);
        
        console.log(`Restaurado '${fullId}' y 'CACHIPAY - SAN MATEO_PZ011' en la colección 'marcaciones'.`);
    } else {
        console.log(`ERROR: No se encontró '${fullId}' en el historial.`);
    }
}

forceRestoreAndVerify().catch(console.error);
