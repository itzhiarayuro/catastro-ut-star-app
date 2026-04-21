import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function seedData() {
    console.log("Seeding test data...");

    // Test data for 'tuberias'
    const tuberiaData = {
        pozoId: "sopó_M001",
        diametro: "8 pulgadas",
        material: "PVC",
        estado: "Bueno",
        direccion: "Entrada Norte",
        timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, "tuberias", "T_001"), tuberiaData);
    console.log("Added T_001 to 'tuberias'");

    // Test data for 'fotos'
    const fotoData = {
        pozoId: "sopó_M001",
        url: "https://firebasestorage.googleapis.com/v0/b/catastro-ut-star.appspot.com/o/fotos%2Ftest_pozo.jpg?alt=media",
        tipo: "Interior",
        fecha: new Date().toISOString(),
        comentario: "Foto de prueba del interior del pozo"
    };
    await setDoc(doc(db, "fotos", "F_001"), fotoData);
    console.log("Added F_001 to 'fotos'");

    process.exit(0);
}

seedData();
