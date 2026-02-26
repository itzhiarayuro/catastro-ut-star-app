import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyClaOKQqLG6-KBNcVaAD_QYlBjeKyP3i2c",
    authDomain: "catastro-ut-star.firebaseapp.com",
    projectId: "catastro-ut-star",
    storageBucket: "catastro-ut-star.firebasestorage.app",
    messagingSenderId: "691178303694",
    appId: "1:691178303694:web:778ae824c94020f990209f"
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
