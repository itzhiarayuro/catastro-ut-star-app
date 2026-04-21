const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function generateOrphanCsv() {
    console.log('--- Buscando Marcaciones y Fichas sin Elaboró ---');
    
    const collections = ['marcaciones', 'fichas'];
    let orphans = [];

    for (const collName of collections) {
        const snapshot = await db.collection(collName).get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const hasOwner = data.createdBy || data.createdByEmail || data.userName;
            
            if (!hasOwner) {
                orphans.push({
                    pozo: data.pozo || data.header?.pozoNo || doc.id.split('_').pop() || 'S/N',
                    municipio: data.municipio || data.header?.municipio || doc.id.split('_')[0] || 'N/A',
                    elaboro: '', // Vacio como pidió el usuario
                    tipo: collName === 'marcaciones' ? 'Marcación' : 'Investigación',
                    fecha: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : 'N/A',
                    id: doc.id
                });
            }
        });
    }

    // Sort by Municipality and Pozo
    orphans.sort((a, b) => a.municipio.localeCompare(b.municipio) || a.pozo.localeCompare(b.pozo));

    // Generate CSV
    let csv = 'Pozo,Municipio,Elaboro,Tipo,Fecha,DocID\n';
    orphans.forEach(o => {
        csv += `"${o.pozo}","${o.municipio}","${o.elaboro}","${o.tipo}","${o.fecha}","${o.id}"\n`;
    });

    const fs = require('fs');
    fs.writeFileSync('huerfanos_audit.csv', csv);
    
    console.log(`CSV generado: huerfanos_audit.csv con ${orphans.length} registros.`);
    
    // Print first 20 for the user
    console.log('\n--- MUESTRA DE 20 REGISTROS VACÍOS ---');
    console.log('| Pozo | Municipio | Elaboró |');
    console.log('| --- | --- | --- |');
    orphans.slice(0, 20).forEach(o => {
        console.log(`| ${o.pozo} | ${o.municipio} |  |`);
    });
}

generateOrphanCsv().catch(console.error);
