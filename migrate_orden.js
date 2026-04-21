import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

const serviceAccount = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'scripts', 'clave.json'), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
    const collections = ["fichas", "historial_fichas"];
    let totalUpdated = 0;

    for (const collName of collections) {
        console.log(`Processing collection: ${collName}`);
        const snapshot = await db.collection(collName).get();
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            let hasChanges = false;
            const updatePayload = {};

            // Logic for Pipes (ENTRADA / SALIDA)
            if (Array.isArray(data.pipes) && data.pipes.length > 0) {
                const counters = {};
                const newPipes = data.pipes.map((p) => {
                    const tipo = String(p.es || p.tipo || 'ENTRADA').toUpperCase().trim();
                    let group = 'ENTRADA';
                    if (tipo.startsWith('SALIDA')) group = 'SALIDA';
                    else if (tipo.startsWith('SUMIDERO')) group = 'SUMIDERO';
                    // We preserve the groups as 'ENTRADA', 'SALIDA', etc.

                    counters[group] = (counters[group] || 0) + 1;
                    
                    if (p.orden !== counters[group]) {
                        hasChanges = true;
                    }

                    return { ...p, orden: counters[group] };
                });
                
                if (hasChanges) {
                    updatePayload.pipes = newPipes;
                }
            }

            // Logic for Sumideros (usually in 'sums' array)
            if (Array.isArray(data.sums) && data.sums.length > 0) {
                let sumsChanged = false;
                const newSums = data.sums.map((s, idx) => {
                    const targetOrden = idx + 1;
                    if (s.orden !== targetOrden) {
                        sumsChanged = true;
                    }
                    return { ...s, orden: targetOrden };
                });

                if (sumsChanged) {
                    updatePayload.sums = newSums;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await doc.ref.update(updatePayload);
                totalUpdated++;
                console.log(`Updated document: ${doc.id}`);
            }
        }
    }

    console.log(`Migration finished. Total documents updated: ${totalUpdated}`);
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
