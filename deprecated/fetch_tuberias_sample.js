import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

const serviceAccount = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'clave.json'), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function peek() {
    console.log("Fetching sample...");
    try {
        const snap = await db.collection("tuberias").limit(5).get();
        if (snap.empty) console.log("tuberias collection is empty");
        snap.forEach(doc => {
            console.log(doc.id, doc.data());
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
peek();
peek();
