const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMunicipalityStats() {
    console.log("Analyzing Firestore data distribution by municipality since March 20th, 2026...");
    const thresholdDate = new Date('2026-03-20T00:00:00Z');
    
    const snapshot = await db.collection('fichas').get();
    const stats = {};
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const mun = data.municipio || "UNKNOWN";
        const createdAt = data.createdAt ? new Date(data.createdAt) : null;
        const lastSync = data.lastSync ? new Date(data.lastSync) : null;
        
        const mostRecent = Math.max(
            createdAt ? createdAt.getTime() : 0,
            lastSync ? lastSync.getTime() : 0
        );
        
        if (!stats[mun]) stats[mun] = { total: 0, afterThreshold: 0, latest: null };
        
        stats[mun].total++;
        if (mostRecent > thresholdDate.getTime()) {
            stats[mun].afterThreshold++;
            if (!stats[mun].latest || mostRecent > new Date(stats[mun].latest).getTime()) {
                stats[mun].latest = new Date(mostRecent).toISOString();
            }
        }
    });
    
    console.table(stats);
    process.exit(0);
}

checkMunicipalityStats();
