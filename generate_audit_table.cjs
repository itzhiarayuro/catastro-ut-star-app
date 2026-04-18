const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function generateAuditTable() {
    console.log('--- Generando Tabla de Auditoría (Fichas + Marcaciones) ---');
    
    // Fetch Marcaciones
    const marcSnap = await db.collection('marcaciones').get();
    let rows = [];

    // Map to store UID -> Email/Name if found in any doc
    const userMap = new Map();

    marcSnap.forEach(doc => {
        const data = doc.data();
        const uid = data.createdBy || 'HUÉRFANO';
        
        // Try to capture email if it exists in the doc (sometimes it's there)
        if (data.createdByEmail) userMap.set(uid, data.createdByEmail);
        else if (data.userName) userMap.set(uid, data.userName);

        rows.push({
            tipo: 'Marcación',
            pozo: data.pozo || data.header?.pozoNo || 'S/N',
            municipio: data.municipio || data.header?.municipio || 'N/A',
            uid: uid,
            fecha: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : 'N/A'
        });
    });

    // Fetch Fichas
    const fichaSnap = await db.collection('fichas').get();
    fichaSnap.forEach(doc => {
        const data = doc.data();
        const uid = data.createdBy || 'HUÉRFANO';
        
        if (data.createdByEmail) userMap.set(uid, data.createdByEmail);

        rows.push({
            tipo: 'Investigación',
            pozo: data.pozo || data.header?.pozoNo || 'S/N',
            municipio: data.municipio || data.header?.municipio || 'N/A',
            uid: uid,
            fecha: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : 'N/A'
        });
    });

    // Produce Table
    console.log('| Tipo | Pozo | Municipio | Fecha | Elaboró (UID/Email) |');
    console.log('| --- | --- | --- | --- | --- |');
    
    // Sort by Date
    rows.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Show first 100 for brevity in console, but I'll write all to a file
    let tableStr = '| Tipo | Pozo | Municipio | Fecha | Elaboró |\n| --- | --- | --- | --- | --- |\n';
    rows.forEach(r => {
        const elaboro = userMap.get(r.uid) || r.uid;
        tableStr += `| ${r.tipo} | ${r.pozo} | ${r.municipio} | ${r.fecha} | ${elaboro} |\n`;
    });

    const fs = require('fs');
    fs.writeFileSync('audit_full_table.md', tableStr);
    console.log('Tabla completa generada en audit_full_table.md');
    
    // Print first 10 to console
    rows.slice(0, 10).forEach(r => {
        const elaboro = userMap.get(r.uid) || r.uid;
        console.log(`| ${r.tipo} | ${r.pozo} | ${r.municipio} | ${r.fecha} | ${elaboro} |`);
    });
}

generateAuditTable().catch(console.error);
