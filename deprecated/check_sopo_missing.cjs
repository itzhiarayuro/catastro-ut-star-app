const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkSopoMissing() {
    console.log('--- Checking SOPO After March 26 ---');
    const q = db.collection('fichas').where('municipio', '==', 'SOPO');
    const snap = await q.get();
    
    console.log(`Total SOPO documents found: ${snap.size}`);
    
    const recent = snap.docs.filter(doc => {
        const d = doc.data();
        const dateStr = d.lastSync || d.savedAt || d.createdAt;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return date > new Date('2026-03-26');
    });
    
    console.log(`SOPO documents after 2026-03-26: ${recent.length}`);
    if (recent.length > 0) {
        console.log('First 5 recent SOPO docs:');
        recent.slice(0, 5).forEach(doc => {
            const d = doc.data();
            console.log(`- ID: ${doc.id}, Elaboro: ${d.elaboro}, Sync Date: ${d.lastSync}`);
        });
    }
}

checkSopoMissing().catch(console.error);
