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

const batchData = [
    { id: 'CIN12B', lat: 6.1704933, lon: -75.3309767, precision: 19 },
    { id: 'M108', lat: 6.1707233, lon: -75.3301797, precision: 19 },
    { id: 'M336', lat: 6.171366, lon: -75.333698, precision: 18 },
    { id: 'M894', lat: 6.170881, lon: -75.325655, precision: 19 },
    { id: 'M895', lat: 6.1707933, lon: -75.3264027, precision: 19 }
];

async function updateBatchCoords() {
    console.log('--- ACTUALIZANDO LOTE DE POZOS RESTANTES EN MARINILLA ---');
    
    let updated = 0;
    let notFound = 0;
    const batch = db.batch();

    for (const item of batchData) {
        const docId = `MARINILLA_${item.id}`;
        const docRef = db.collection('fichas').doc(docId);
        const doc = await docRef.get();
        
        // Convertir Lat/Lon a X/Y
        const [x, y] = proj4('EPSG:4326', 'EPSG:9377', [item.lon, item.lat]);
        const coordX = Math.round(x * 1000) / 1000;
        const coordY = Math.round(y * 1000) / 1000;

        if (doc.exists) {
            batch.update(docRef, {
                coordenada_x: coordX,
                coordenada_y: coordY,
                gps: {
                    ...doc.data().gps,
                    lat: item.lat,
                    lng: item.lon,
                    precision: item.precision
                },
                lastSync: new Date().toISOString()
            });
            console.log(`[QUEUED] ${item.id} -> X: ${coordX}, Y: ${coordY}`);
            updated++;
        } else {
            console.warn(`[SKIP] Documento no encontrado: ${docId}`);
            notFound++;
        }
    }

    if (updated > 0) {
        await batch.commit();
    }

    console.log(`\n✅ Resumen final: ${updated} actualizados, ${notFound} no encontrados.`);
}

updateBatchCoords().catch(console.error);
