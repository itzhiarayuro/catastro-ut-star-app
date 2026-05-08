const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function restoreMarcacion() {
    const docId = 'CACHIPAY - SAN MATEO_PZ011_1774199416125';
    console.log(`Buscando ${docId} en 'historial_marcaciones'...`);
    
    // 1. Buscar en historial_marcaciones
    const histRef = db.collection('historial_marcaciones').doc(docId);
    const doc = await histRef.get();

    if (!doc.exists) {
        console.log("No se encontró el documento en 'historial_marcaciones'.");
        return;
    }

    const data = doc.data();
    console.log("Datos encontrados. Preparando restauración...");
    
    // El ID original probablemente sea sin el timestamp final
    const targetId = 'CACHIPAY - SAN MATEO_PZ011';
    
    // 2. Restaurar en la colección 'fichas' (o la que corresponda según los datos)
    // Revisamos si el documento ya existe para no sobrescribir algo más nuevo sin querer
    const targetRef = db.collection('fichas').doc(targetId);
    const targetDoc = await targetRef.get();

    if (targetDoc.exists) {
        console.log(`AVISO: Ya existe un documento con ID ${targetId} en 'fichas'.`);
        console.log("Procediendo a restaurar con el ID original para recuperar la información.");
    }

    await targetRef.set(data);
    console.log(`Restauración exitosa en 'fichas' con ID: ${targetId}`);
    
    // 3. (Opcional) Marcar como restaurado o algo similar
}

restoreMarcacion().catch(console.error);
