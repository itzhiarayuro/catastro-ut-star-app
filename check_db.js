import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

const serviceAccount = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'scripts', 'clave.json'), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    console.log("Checking tuberias...");
    const tSnap = await db.collection("tuberias").limit(1).get();
    if (!tSnap.empty) {
        console.log("tuberias sample:", tSnap.docs[0].id, tSnap.docs[0].data());
    } else {
        console.log("tuberias is empty");
    }

    console.log("Checking fichas...");
    const fSnap = await db.collection("fichas").limit(1).get();
    if (!fSnap.empty) {
        const data = fSnap.docs[0].data();
        console.log("fichas sample pipes:", data.pipes);
        console.log("fichas sample sums:", data.sums);
    }

    process.exit(0);
}
run();
