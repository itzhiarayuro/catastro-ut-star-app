const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkDeleted() {
    const snap = await db.collection('fichas').where('deleted', '==', true).get();
    console.log(`Total deleted documents: ${snap.size}`);
    
    if (snap.size > 0) {
        snap.docs.slice(0, 5).forEach(doc => {
            console.log(`- ID: ${doc.id}, Municipio: ${doc.data().municipio}`);
        });
    }
}

checkDeleted().catch(console.error);
