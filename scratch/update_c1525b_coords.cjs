const admin = require('firebase-admin');
const proj4 = require('proj4');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const EPSG9377 = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
proj4.defs('EPSG:9377', EPSG9377);

async function updateC1525B() {
    const lat = 6.1752623;
    const lon = -75.3454946;
    const precision = 72;
    const pozoId = 'C1525B';
    const docId = `MARINILLA_${pozoId}`;
    
    console.log(`Convirtiendo coordenadas para ${pozoId}...`);
    
    // De Lat/Lon a X/Y (Nacional)
    const [x, y] = proj4('EPSG:4326', 'EPSG:9377', [lon, lat]);
    const coordX = Math.round(x * 1000) / 1000;
    const coordY = Math.round(y * 1000) / 1000;
    
    console.log(`Resultados: X=${coordX}, Y=${coordY}`);
    
    const docRef = db.collection('fichas').doc(docId);
    const doc = await docRef.get();
    
    if (doc.exists) {
        await docRef.update({
            coordenada_x: coordX,
            coordenada_y: coordY,
            gps: {
                ...doc.data().gps,
                lat: lat,
                lng: lon,
                precision: precision
            },
            lastSync: new Date().toISOString()
        });
        console.log(`✅ Pozo ${pozoId} actualizado correctamente.`);
    } else {
        console.error(`❌ Error: Documento ${docId} no encontrado.`);
    }
}

updateC1525B().catch(console.error);
