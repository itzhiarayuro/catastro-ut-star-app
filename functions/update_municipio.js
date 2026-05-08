const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

const pozosToUpdate = [
    'P03', 'P22', 'P238', 'P241', 'P245', 'P40', 'P59', 'P60', 'P68', 'P70', 'P71', 'PP01', 'PZ07', 'PZ09', 'PZ1034', 'PZ104', 'PZ106', 'PZ1080', 'PZ1096', 'PZ110', 'PZ19', 'PZ257A', 'PZ29', 'PZCANO2'
];

async function updatePozos() {
    let successCount = 0;
    let notFoundCount = 0;
    for (const pozo of pozosToUpdate) {
        const docId = `SOPO_${pozo}`;
        const ref = db.collection('fichas').doc(docId);
        const doc = await ref.get();
        if (doc.exists) {
            await ref.update({ municipio: 'PENDIENTE' });
            console.log(`Updated ${docId}`);
            successCount++;
        } else {
            console.log(`${docId} not found`);
            notFoundCount++;
        }
    }
    console.log(`Update complete. Success: ${successCount}, Not Found: ${notFoundCount}`);
    process.exit(0);
}

updatePozos().catch(err => {
    console.error(err);
    process.exit(1);
});
