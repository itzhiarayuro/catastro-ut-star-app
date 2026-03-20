const admin = require('firebase-admin');
const proj4 = require('proj4');
const fs = require('fs');

// Configuración de Proyección EPSG:9377
const EPSG9377 = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

const convertirA9377 = (lat, lon) => {
    if (!lat || !lon) return { x: 0, y: 0 };
    const [x, y] = proj4('EPSG:4326', EPSG9377, [lon, lat]);
    return {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100
    };
};

async function main() {
    const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    const codigos = ["C001", "C002", "C003", "C004"];
    const municipio = "RICAURTE";

    console.log(`| Código | Latitud | Longitud | Coord X (E) | Coord Y (N) |`);
    console.log(`|--------|---------|----------|-------------|-------------|`);

    for (const cod of codigos) {
        const docId = `${municipio}_${cod}`;
        const doc = await db.collection("marcaciones").doc(docId).get();

        if (doc.exists) {
            const data = doc.data();
            const gps = data.gps || {};
            const lat = gps.lat;
            const lon = gps.lng;

            if (lat && lon) {
                const { x, y } = convertirA9377(lat, lon);
                console.log(`| ${cod} | ${lat.toFixed(7)} | ${lon.toFixed(7)} | ${x.toFixed(2)} | ${y.toFixed(2)} |`);
            } else {
                console.log(`| ${cod} | Sin GPS | Sin GPS | - | - |`);
            }
        } else {
            console.log(`| ${cod} | No encontrado | - | - | - |`);
        }
    }
}

main().catch(console.error);
