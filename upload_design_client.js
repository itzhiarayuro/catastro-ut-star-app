import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

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

async function upload() {
    try {
        // Use the CLEANED version without transparent colors
        const data = JSON.parse(fs.readFileSync("plantilla-clean.json", "utf8"));

        // Double-check no transparent remains
        const str = JSON.stringify(data);
        const count = (str.match(/transparent/gi) || []).length;
        console.log(`Transparent occurrences in data: ${count}`);
        if (count > 0) {
            console.error("ERROR: Still has transparent values!");
            process.exit(1);
        }

        console.log("Uploading clean design to Firestore...");
        console.log(`Shapes: ${data.shapes?.length}, Placements: ${data.placements?.length}`);

        await setDoc(doc(db, "fichas_disenos", "default"), {
            ...data,
            updatedAt: new Date().toISOString()
        });
        console.log("Upload succeeded!");
        process.exit(0);
    } catch (e) {
        console.error("Upload failed:", e);
        process.exit(1);
    }
}
upload();
