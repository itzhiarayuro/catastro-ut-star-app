const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkPZ011Global() {
    console.log("--- Buscando 'PZ011' en TODA la base de datos ---");
    const collections = ['fichas', 'historial_fichas'];
    
    for (const col of collections) {
        console.log(`\nRevisando colección: ${col}`);
        const ref = db.collection(col);
        const snapshot = await ref.get();
        
        console.log(`Total documentos en ${col}: ${snapshot.size}`);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const idDoc = doc.id.toUpperCase();
            // Buscamos en varios campos comunes
            const pozo = (data.pozo || '').toUpperCase();
            const idField = (data.id || '').toUpperCase();
            const municipio = (data.municipio || '').toUpperCase();
            const vereda = (data.vereda || data.sector || '').toUpperCase();

            if (idDoc.includes('PZ011') || pozo.includes('PZ011') || idField.includes('PZ011')) {
                console.log(`MATCH ENCONTRADO en ${col}:`);
                console.log(`- ID Documento: ${doc.id}`);
                console.log(`- Campo 'pozo': ${data.pozo}`);
                console.log(`- Campo 'id': ${data.id}`);
                console.log(`- Municipio: ${data.municipio}`);
                console.log(`- Vereda/Sector: ${data.vereda || data.sector}`);
                console.log('-------------------------------------------');
            }
        });
    }
}

checkPZ011Global().catch(console.error);
