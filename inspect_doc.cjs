const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspectDoc() {
    const doc = await db.collection('fichas').doc('SIBATE_PZ09').get();
    if (doc.exists) {
        console.log(JSON.stringify(doc.data(), null, 2));
    } else {
        console.log("Document not found.");
    }
    process.exit(0);
}

inspectDoc().catch(err => {
    console.error(err);
    process.exit(1);
});
