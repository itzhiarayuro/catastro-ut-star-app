const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
    const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    const docId = "RICAURTE_V010"; // Probando con el ID del documento
    
    console.log(`Buscando coordenadas de ${docId}...`);
    
    // Buscar en marcaciones
    let doc = await db.collection("marcaciones").doc(docId).get();
    
    if (!doc.exists) {
        // Si no está como RICAURTE_V010, buscar si es un código dentro de la colección
        const snapshot = await db.collection("marcaciones")
            .where("codigo", "==", "V010")
            .where("municipio", "==", "RICAURTE")
            .get();
        if (!snapshot.empty) doc = snapshot.docs[0];
    }

    if (doc.exists) {
        const data = doc.data();
        console.log(`Documento encontrado: ${doc.id}`);
        console.log(`Latitud: ${data.gps?.lat}`);
        console.log(`Longitud: ${data.gps?.lng}`);
        console.log(`Coordenada X (E): ${data.coordenada_x}`);
        console.log(`Coordenada Y (N): ${data.coordenada_y}`);
    } else {
        console.log("No se encontró el punto V010 en Ricaurte.");
    }
}

main().catch(console.error);
