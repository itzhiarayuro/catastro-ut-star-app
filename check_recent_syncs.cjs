const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkRecentSyncs() {
    const now = new Date();
    // Check records synced in the last 30 minutes
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    console.log(`Checking for syncs after: ${thirtyMinsAgo.toISOString()}`);

    const snapshot = await db.collection('fichas')
        .where('lastSync', '>=', thirtyMinsAgo.toISOString())
        .get();

    console.log(`\nFound ${snapshot.size} records synced in the last 30 minutes.\n`);

    if (snapshot.size > 0) {
        const table = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            table.push({
                Pozo: data.pozo,
                Municipio: data.municipio,
                Inspector: data.elaboro,
                LastSync: data.lastSync
            });
        });
        console.table(table);
    } else {
        console.log("No new records detected yet. Remember that background sync runs every 30 minutes unless manually triggered.");
    }

    process.exit(0);
}

checkRecentSyncs().catch(err => {
    console.error(err);
    process.exit(1);
});
