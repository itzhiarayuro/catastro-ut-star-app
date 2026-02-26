import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';

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
