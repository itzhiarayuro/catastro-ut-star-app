const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function fastFix() {
    const fullId = 'CACHIPAY - SAN MATEO_PZ011_1774199416125';
    const shortId = 'CACHIPAY - SAN MATEO_PZ011';
    
    console.log(`Buscando ${fullId} en historial...`);
    const histDoc = await db.collection('historial_marcaciones').doc(fullId).get();

    if (histDoc.exists) {
        const data = histDoc.data();
        // Aseguramos que el tipo de registro sea el correcto para que la app lo vea
        data.tipoRegistro = 'MARCACION'; 
        
        console.log(`Restaurando en 'marcaciones' con IDs: ${fullId} y ${shortId}`);
        await db.collection('marcaciones').doc(fullId).set(data);
        await db.collection('marcaciones').doc(shortId).set(data);
        
        // Verificamos de inmediato
        const check = await db.collection('marcaciones').doc(shortId).get();
        if (check.exists) {
            console.log("CONFIRMADO: El documento ya existe en 'marcaciones' (visto por SDK).");
        }
    } else {
        console.log("No se encontró el origen en el historial.");
    }
}

fastFix().catch(console.error);
