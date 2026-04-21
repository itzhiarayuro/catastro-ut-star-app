import 'dotenv/config'; // Carga las variables desde .env
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';

// Extraer configuración desde el archivo .env.local
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

async function fetchData() {
    const collections = ["fichas", "tuberias", "fotos"];
    for (const coll of collections) {
        console.log(`--- Collection: ${coll} ---`);
        try {
            const querySnapshot = await getDocs(collection(db, coll));
            if (querySnapshot.empty) {
                console.log(`No documents found in '${coll}'.`);
            } else {
                querySnapshot.forEach((doc) => {
                    console.log(`ID: ${doc.id}`);
                    console.log(JSON.stringify(doc.data(), null, 2));
                    console.log("------------------------");
                });
            }
        } catch (error) {
            console.error(`Error fetching collection ${coll}:`, error);
        }
    }
    process.exit(0);
}

fetchData();
