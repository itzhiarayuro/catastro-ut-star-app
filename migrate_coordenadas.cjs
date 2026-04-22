/**
 * migrate_coordenadas.cjs
 *
 * Migra fichas y marcaciones que tienen gps.lat/gps.lng pero no tienen
 * coordenada_x/coordenada_y (o los tienen en 0), calculándolos en EPSG:9377
 * (MAGNA-SIRGAS Origen Nacional - sistema oficial de Colombia).
 *
 * Uso:
 *   node migrate_coordenadas.cjs           → modo DRY-RUN (solo reporta)
 *   node migrate_coordenadas.cjs --write   → aplica los cambios en Firestore
 */

const admin = require('firebase-admin');
const proj4 = require('proj4');
const serviceAccount = require('./service-account.json');

// ─── Configuración EPSG:9377 ────────────────────────────────────────────────
const EPSG9377 = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
proj4.defs('EPSG:9377', EPSG9377);

function convertirA9377(lat, lon) {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;
    try {
        const [x, y] = proj4('EPSG:4326', 'EPSG:9377', [lon, lat]);
        return {
            coordenada_x: Math.round(x * 1000) / 1000,
            coordenada_y: Math.round(y * 1000) / 1000,
        };
    } catch (e) {
        return null;
    }
}

// Rango válido EPSG:9377 para Colombia continental
// X (Easting):  4,600,000 – 5,400,000 m
// Y (Northing): 1,000,000 – 3,000,000 m
function esUTMValido(cx, cy) {
    return (
        typeof cx === 'number' && cx >= 4600000 && cx <= 5400000 &&
        typeof cy === 'number' && cy >= 1000000 && cy <= 3000000
    );
}

function necesitaMigracion(data) {
    const lat = data.gps?.lat;
    const lng = data.gps?.lng;
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return false; // Sin GPS válido
    return !esUTMValido(data.coordenada_x, data.coordenada_y);
}

// ─── Init Firebase ───────────────────────────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const DRY_RUN = !process.argv.includes('--write');

// ─── Función principal ───────────────────────────────────────────────────────
async function migrar(coleccion) {
    console.log(`\n📂 Procesando colección: ${coleccion}`);
    const snap = await db.collection(coleccion).get();

    let total = 0, migradas = 0, sinGPS = 0, conError = 0;
    const batch_size = 400; // Firestore batch limit es 500
    let batch = db.batch();
    let enBatch = 0;

    for (const doc of snap.docs) {
        total++;
        const data = doc.data();

        if (!necesitaMigracion(data)) continue;

        const coords = convertirA9377(data.gps.lat, data.gps.lng);
        if (!coords) {
            sinGPS++;
            console.warn(`  ⚠️  ${doc.id} — GPS inválido: lat=${data.gps?.lat} lng=${data.gps?.lng}`);
            continue;
        }

        migradas++;
        console.log(`  ✅ ${doc.id} → X=${coords.coordenada_x}  Y=${coords.coordenada_y}  (lat=${data.gps.lat}, lng=${data.gps.lng})`);

        if (!DRY_RUN) {
            batch.update(doc.ref, {
                coordenada_x: coords.coordenada_x,
                coordenada_y: coords.coordenada_y,
            });
            enBatch++;

            if (enBatch >= batch_size) {
                await batch.commit();
                batch = db.batch();
                enBatch = 0;
            }
        }
    }

    if (!DRY_RUN && enBatch > 0) {
        await batch.commit();
    }

    console.log(`\n  📊 Resultados ${coleccion}:`);
    console.log(`     Total documentos : ${total}`);
    console.log(`     Necesitaban migración: ${migradas}`);
    console.log(`     Sin GPS válido   : ${sinGPS}`);
    if (DRY_RUN) {
        console.log(`     ⚠️  DRY-RUN: no se escribió nada. Usa --write para aplicar.`);
    } else {
        console.log(`     ✅ Documentos actualizados: ${migradas}`);
    }

    return { total, migradas, sinGPS, conError };
}

async function run() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  MIGRACIÓN DE COORDENADAS UTM (EPSG:9377)');
    console.log(`  Modo: ${DRY_RUN ? '🔍 DRY-RUN (solo lectura)' : '✏️  WRITE (aplicando cambios)'}`);
    console.log('═══════════════════════════════════════════════════');

    const fichas = await migrar('fichas');
    const marcaciones = await migrar('marcaciones');

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  RESUMEN TOTAL');
    console.log(`  fichas      → ${fichas.migradas} / ${fichas.total} migradas`);
    console.log(`  marcaciones → ${marcaciones.migradas} / ${marcaciones.total} migradas`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
}

run().catch(err => {
    console.error('ERROR FATAL:', err);
    process.exit(1);
});
