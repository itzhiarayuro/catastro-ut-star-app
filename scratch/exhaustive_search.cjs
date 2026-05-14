const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/ICA2025/.gemini/antigravity/scratch/catastro-ut-star-app/scripts/clave.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function searchEverywhere() {
    const collections = ['fichas', 'marcaciones', 'historial_fichas'];
    const target = 1.314;
    const tolerance = 0.0001;

    for (const collName of collections) {
        console.log(`Searching in ${collName}...`);
        const snapshot = await db.collection(collName).get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const stringified = JSON.stringify(data);
            if (stringified.includes('1.314')) {
                console.log(`MATCH in ${collName}/${doc.id}: Found 1.314 string`);
            }
            
            // Recursive search for the number
            function checkObject(obj, path = '') {
                for (const key in obj) {
                    const val = obj[key];
                    const currentPath = path ? `${path}.${key}` : key;
                    if (typeof val === 'number') {
                        if (Math.abs(val - target) < tolerance) {
                            console.log(`NUMERIC MATCH in ${collName}/${doc.id} at ${currentPath}: ${val}`);
                        }
                    } else if (typeof val === 'object' && val !== null) {
                        checkObject(val, currentPath);
                    }
                }
            }
            checkObject(data);
        });
    }
}

searchEverywhere().catch(console.error);
