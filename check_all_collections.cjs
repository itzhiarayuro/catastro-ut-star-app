const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkLateData() {
    console.log("Checking all collections for data after March 27th, 2026...");
    const thresholdDate = new Date('2026-03-27T00:00:00Z');
    
    const collections = ['fichas', 'historial_fichas', 'marcaciones', 'logs', 'sync_registry'];
    
    for (const colName of collections) {
        console.log(`\n--- Collection: ${colName} ---`);
        try {
            const snapshot = await db.collection(colName).get();
            let count = 0;
            let lateDocs = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const createdAt = data.createdAt ? new Date(data.createdAt) : null;
                const lastSync = data.lastSync ? new Date(data.lastSync) : null;
                const timestamp = data.timestamp ? new Date(data.timestamp) : null;
                
                const mostRecent = Math.max(
                    createdAt ? createdAt.getTime() : 0,
                    lastSync ? lastSync.getTime() : 0,
                    timestamp ? timestamp.getTime() : 0
                );
                
                if (mostRecent > thresholdDate.getTime()) {
                    count++;
                    lateDocs.push({
                        id: doc.id,
                        pozo: data.pozo || data.codigo,
                        mun: data.municipio,
                        date: new Date(mostRecent).toISOString()
                    });
                }
            });
            
            console.log(`Found ${count} documents after March 27th.`);
            if (count > 0) {
                console.log("Samples:");
                lateDocs.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5).forEach(d => {
                    console.log(` - [${d.date}] ID: ${d.id}, Pozo/Cod: ${d.pozo}, Mun: ${d.mun}`);
                });
            }
        } catch (e) {
            console.error(`Error checking ${colName}:`, e.message);
        }
    }
    
    process.exit(0);
}

checkLateData();
