const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkInspectors() {
    console.log('--- Inspector Activity Report ---');
    const fichasSnap = await db.collection('fichas').get();
    const stats = {};

    fichasSnap.docs.forEach(doc => {
        const data = doc.data();
        const inspector = data.elaboro || data.inspector || 'UNKNOWN';
        const dateStr = data.lastSync || data.createdAt || 'NO_DATE';
        const date = dateStr !== 'NO_DATE' ? new Date(dateStr) : null;

        if (!stats[inspector]) {
            stats[inspector] = { count: 0, lastDate: null, lastMuni: '' };
        }
        stats[inspector].count++;
        if (date && (!stats[inspector].lastDate || date > stats[inspector].lastDate)) {
            stats[inspector].lastDate = date;
            stats[inspector].lastMuni = data.municipio || '';
        }
    });

    const report = Object.entries(stats).map(([name, data]) => ({
        name,
        count: data.count,
        lastDate: data.lastDate ? data.lastDate.toISOString() : 'N/A',
        lastMuni: data.lastMuni
    })).sort((a, b) => b.lastDate.localeCompare(a.lastDate));

    console.table(report);
}

checkInspectors().catch(console.error);
