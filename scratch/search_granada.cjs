const admin = require('firebase-admin');
const fs = require('fs');

async function searchInGranada() {
    const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    const target = "1.314";

    console.log(`Searching for ${target} in Granada fichas...`);

    const snapshot = await db.collection('fichas')
        .where('municipio', '==', 'GRANADA')
        .get();
    
    console.log(`Checking ${snapshot.size} documents in Granada...`);

    let foundCount = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        const jsonStr = JSON.stringify(data);
        if (jsonStr.includes(target)) {
            console.log(`Found match in fichas/${doc.id}`);
            foundCount++;
        }
    });

    console.log(`Total found in Granada: ${foundCount}`);
}

searchInGranada().catch(console.error);
