const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function search() {
    const collections = ['fichas', 'marcaciones'];
    const target = 1.3140;
    const targetStr = "1.3140";
    const targetStrComma = "1,3140";

    for (const colName of collections) {
        console.log(`Searching in ${colName}...`);
        const snap = await db.collection(colName).get();
        snap.docs.forEach(doc => {
            const data = JSON.stringify(doc.data());
            if (data.includes(targetStr) || data.includes(targetStrComma) || data.includes('1.314')) {
                console.log(`Match found in ${colName}/${doc.id}`);
                // Print specific fields that match
                const d = doc.data();
                Object.keys(d).forEach(key => {
                    const val = d[key];
                    if (typeof val === 'string' && (val.includes(targetStr) || val.includes(targetStrComma) || val.includes('1.314'))) {
                        console.log(`  Field ${key}: ${val}`);
                    } else if (typeof val === 'number' && Math.abs(val - target) < 0.0001) {
                        console.log(`  Field ${key}: ${val}`);
                    } else if (Array.isArray(val)) {
                         val.forEach((item, index) => {
                             if (JSON.stringify(item).includes('1.314')) {
                                 console.log(`  Field ${key}[${index}]: ${JSON.stringify(item)}`);
                             }
                         });
                    } else if (typeof val === 'object' && val !== null) {
                        if (JSON.stringify(val).includes('1.314')) {
                            console.log(`  Field ${key}: ${JSON.stringify(val)}`);
                        }
                    }
                });
            }
        });
    }
}

search().catch(console.error);
