const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkPozosDiam() {
    const pozos = [
        'C130', 'C1525B', 'CIN12A', 'CIN12C', 'CIN12D', 
        'CIN191', 'CIN19D', 'CIN27', 'CIN4', 'CIN40', 
        'M074', 'M108', 'M336', 'M337', 'M905'
    ];
    
    console.log(`Checking ${pozos.length} pozos in Marinilla...`);
    
    for (const pozo of pozos) {
        const docId = `MARINILLA_${pozo}`;
        const docRef = db.collection('fichas').doc(docId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            console.log(`[${pozo}] diam: ${data.diam}, diametro: ${data.diametro}`);
        } else {
            console.log(`[${pozo}] DOCUMENT NOT FOUND (MARINILLA_${pozo})`);
        }
    }
}

checkPozosDiam().catch(console.error);
