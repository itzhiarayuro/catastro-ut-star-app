const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkRealtime() {
    console.log(`Current server time: ${new Date().toISOString()}`);
    
    // Deployed around 19:40 UTC. Let's check from 19:40 to now.
    const startTime = "2026-04-07T19:40:00Z";
    
    console.log(`Checking for changes (lastSync or savedAt) since deployment: ${startTime}`);

    const syncSnap = await db.collection('fichas')
        .where('lastSync', '>=', startTime)
        .get();

    const savedSnap = await db.collection('fichas')
        .where('savedAt', '>=', startTime)
        .get();

    const allIds = new Set();
    const results = [];

    const processDoc = (doc) => {
        if (!allIds.has(doc.id)) {
            allIds.add(doc.id);
            const data = doc.data();
            results.push({
                ID: doc.id,
                Pozo: data.pozo,
                Municipio: data.municipio,
                SavedAt: data.savedAt,
                LastSync: data.lastSync,
                Inspector: data.elaboro
            });
        }
    };

    syncSnap.forEach(processDoc);
    savedSnap.forEach(processDoc);

    console.log(`\nNew Syncs detected: ${results.length}\n`);

    if (results.length > 0) {
        console.table(results);
    } else {
        console.log("No data flow detected yet. Most likely inspectors haven't refreshed their apps or background sync interval (30m) hasn't triggered.");
    }

    process.exit(0);
}

checkRealtime().catch(err => {
    console.error(err);
    process.exit(1);
});
