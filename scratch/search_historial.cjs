const admin = require('firebase-admin');
const fs = require('fs');

async function searchInHistorial() {
    const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    const target = 1.3140;
    const targetStr = "1.3140";
    const targetStrComma = "1,3140";

    console.log(`Searching for ${targetStr} or ${targetStrComma} in historial_fichas...`);

    const snapshot = await db.collection('historial_fichas').get();
    console.log(`Checking ${snapshot.size} documents...`);

    let found = false;
    snapshot.forEach(doc => {
        const data = doc.data();
        const jsonStr = JSON.stringify(data);
        if (jsonStr.includes(targetStr) || jsonStr.includes(targetStrComma) || jsonStr.includes('1.314')) {
            console.log(`Found match in historial_fichas/${doc.id}`);
            found = true;
            for (const key in data) {
                if (JSON.stringify(data[key]).includes('1.314')) {
                    console.log(`  Field: ${key}, Value: ${JSON.stringify(data[key])}`);
                }
            }
        }
    });

    if (!found) console.log("No matches found in historial_fichas.");
}

searchInHistorial().catch(console.error);
