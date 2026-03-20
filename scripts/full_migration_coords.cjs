const admin = require('firebase-admin');
const proj4 = require('proj4');
const fs = require('fs');

// Configuración de Proyección EPSG:9377 (Standard Colombiano CTM12)
const EPSG9377 = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

const convertirA9377 = (lat, lon) => {
    if (!lat || !lon) return null;
    try {
        const [x, y] = proj4('EPSG:4326', EPSG9377, [lon, lat]);
        return {
            x: Math.round(x * 1000) / 1000,
            y: Math.round(y * 1000) / 1000
        };
    } catch (e) {
        return null;
    }
};

async function migrateCollection(db, collectionName) {
    console.log(`\n>>> Iniciando migración de: ${collectionName}`);
    const snapshot = await db.collection(collectionName).get();
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const total = snapshot.size;
    console.log(`    Total de documentos encontrados: ${total}`);

    for (const docItem of snapshot.docs) {
        const data = docItem.data();
        const gps = data.gps || {};
        const lat = gps.lat;
        const lon = gps.lng || gps.lon; // Soportamos ambos nombres comunes

        if (lat !== undefined && lat !== null && lon !== undefined && lon !== null) {
            const result = convertirA9377(lat, lon);
            
            if (result) {
                const { x, y } = result;
                
                // Evitar escritura si ya coinciden (Idempotencia)
                if (data.coordenada_x === x && data.coordenada_y === y) {
                    skipped++;
                    continue;
                }

                try {
                    await docItem.ref.update({
                        coordenada_x: x,
                        coordenada_y: y,
                        updatedByMigration: new Date().toISOString()
                    });
                    updated++;
                } catch (err) {
                    errors++;
                    console.error(`    [ERROR] ${docItem.id}: ${err.message}`);
                }
            } else {
                errors++;
                console.log(`    [ERROR] ${docItem.id}: Error en cálculo.`);
            }
        } else {
            skipped++;
        }

        if ((updated + skipped + errors) % 100 === 0) {
            console.log(`    Progreso: ${updated + skipped + errors} / ${total}...`);
        }
    }
    
    console.log(`<<< Fin ${collectionName}: ${updated} actualizados, ${skipped} omitidos, ${errors} errores.`);
}

async function main() {
    console.log("=========================================");
    console.log("MIGRACIÓN DE COORDENADAS EPSG:9377 (3 DEC)");
    console.log("=========================================");

    const serviceAccountPath = 'service-account.json';
    if (!fs.existsSync(serviceAccountPath)) {
        console.error("Error: No se encontró service-account.json en la raíz.");
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    
    // Lista de colecciones a migrar
    const targetCollections = ['fichas', 'marcaciones', 'historial_fichas', 'historial_marcaciones'];
    
    for (const coll of targetCollections) {
        await migrateCollection(db, coll);
    }

    console.log("\n=========================================");
    console.log("MIGRACIÓN COMPLETADA EXITOSAMENTE");
    console.log("=========================================");
}

main().catch(err => {
    console.error("\n[FATAL ERROR]:", err);
    process.exit(1);
});
