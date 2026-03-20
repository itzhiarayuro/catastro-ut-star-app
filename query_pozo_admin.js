import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

// INSTRUCCIONES:
// 1. Asegúrate de tener un archivo service-account.json en esta carpeta
// 2. Ejecuta: node query_pozo_admin.js

async function run() {
    try {
        const serviceAccount = JSON.parse(
            await readFile('./service-account.json', 'utf8')
        );

        initializeApp({
            credential: cert(serviceAccount)
        });

        const db = getFirestore();
        const pozoId = 'C01AA';

        console.log(`Buscando datos técnicos para el pozo: ${pozoId}...`);

        const collections = ['fichas'];
        let found = false;

        for (const collName of collections) {
            const snapshot = await db.collection(collName)
                .where('pozo', 'in', [pozoId, `MARINILLA_${pozoId}`])
                .get();

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`\n✅ ENCONTRADO en colección '${collName}' (ID doc: ${doc.id})`);
                    console.log('---------------------------------------------------------');

                    const result = {
                        'Estado Pozo': data.estadoPozo || data.estado || 'VACÍO',
                        'Sistema': data.sistema || 'VACÍO',
                        'Altura (m)': data.altura || data.depth || 0,
                        'Cámara (Tipo)': data.camara || 'VACÍO',
                        'Rasante (Material)': data.rasante || 'VACÍO',
                        'ID Pozo / Código': data.pozo || data.codigo || 'VACÍO',
                        'Tapa - Material': data.tapa?.mat || 'VACÍO',
                        'Tapa - Estado': data.tapa?.estado || 'VACÍO',
                        'Fecha': data.fecha || 'VACÍO',
                        'Cono - Tipo': data.cono?.tipo || 'VACÍO',
                        'Levantó': data.inspector || data.levanto || 'VACÍO',
                        'Dirección': data.direccion || 'VACÍO',
                        'Cuerpo - Existe': data.cuerpo?.existe || 'VACÍO',
                        'Cuerpo - Diámetro': data.diam || data.diameter || 0,
                        'Cuerpo - Material': data.cuerpo?.mat || 'VACÍO',
                        'Cuerpo - Estado': data.cuerpo?.estado || 'VACÍO',
                        'Cañuela - Existe': data.canu?.existe || 'VACÍO',
                        'Cañuela - Material': data.canu?.mat || 'VACÍO',
                        'Cañuela - Estado': data.canu?.estado || 'VACÍO',
                        'Peldaños - Existe': data.peld?.existe || 'VACÍO',
                        'Peldaños - Material': data.peld?.mat || 'VACÍO',
                        'Peldaños - Número': data.peld?.num || 0,
                        'Peldaños - Estado': data.peld?.estado || 'VACÍO'
                    };

                    console.table(result);
                    console.log('\nJSON COMPLETO (por si acaso):');
                    console.log(JSON.stringify(data, null, 2));
                });
                found = true;
            }
        }

        if (!found) {
            console.log('❌ No se encontró ningún pozo con ese código.');
            console.log('Intentando búsqueda por ID de documento directo...');
            const docRef = db.collection('fichas').doc(pozoId);
            const doc = await docRef.get();
            if (doc.exists) {
                console.log('✅ Encontrado por ID de documento!');
                console.log(JSON.stringify(doc.data(), null, 2));
            } else {
                console.log('❌ Tampoco existe un documento con ese ID.');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('ENOENT')) {
            console.log('\n⚠️  ERROR: No se encontró el archivo service-account.json');
            console.log('Por favor, descarga tu llave de Firebase (IAM -> Service Accounts) y guárdala como "service-account.json" en esta carpeta.');
        }
    }
}

run();

