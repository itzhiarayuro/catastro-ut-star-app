
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRecords() {
    console.log("Checking 'marcaciones' collection...");
    const q1 = await getDocs(collection(db, "marcaciones"));
    console.log(`Found ${q1.size} master records.`);

    console.log("Checking 'historial_marcaciones' collection...");
    const q2 = await getDocs(collection(db, "historial_marcaciones"));
    console.log(`Found ${q2.size} history records.`);

    q2.forEach(doc => {
        console.log(`- Version: ${doc.id} (Ref: ${doc.data().codigo})`);
    });
}

checkRecords()
    .then(() => {
        console.log("Check complete.");
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
