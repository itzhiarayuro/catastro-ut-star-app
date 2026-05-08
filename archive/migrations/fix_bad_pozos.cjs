const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Set project ID to avoid ADC errors
process.env.GCLOUD_PROJECT = 'catastro-ut-star';
initializeApp({ projectId: 'catastro-ut-star' });
const db = getFirestore();

async function fixPozos() {
    console.log("Starting to fix bad pozos...");

    // 1. GRANADA_PPZ09 -> Delete (GRANADA_PZ09 exists and is more complete)
    console.log("Deleting GRANADA_PPZ09...");
    await db.collection('fichas').doc('GRANADA_PPZ09').delete();
    console.log("Deleted GRANADA_PPZ09.");

    // 2. GRANADA_PPZ269 -> Rename to GRANADA_PZ269
    console.log("Renaming GRANADA_PPZ269 to GRANADA_PZ269...");
    const p269Ref = db.collection('fichas').doc('GRANADA_PPZ269');
    const p269Doc = await p269Ref.get();
    if (p269Doc.exists) {
        let data = p269Doc.data();
        data.pozo = 'PZ269';
        await db.collection('fichas').doc('GRANADA_PZ269').set(data);
        await p269Ref.delete();
        console.log("Renamed GRANADA_PPZ269 successfully.");
    } else {
        console.log("GRANADA_PPZ269 not found.");
    }

    // 3. SOPO_PPZ63 -> Delete
    console.log("Deleting SOPO_PPZ63...");
    await db.collection('fichas').doc('SOPO_PPZ63').delete();
    console.log("Deleted SOPO_PPZ63.");

    // 4. SOPO_PPZ65 -> Merge photos to SOPO_PZ65, then delete
    console.log("Merging photos from SOPO_PPZ65 to SOPO_PZ65...");
    const badP65Ref = db.collection('fichas').doc('SOPO_PPZ65');
    const goodP65Ref = db.collection('fichas').doc('SOPO_PZ65');
    const [badP65Doc, goodP65Doc] = await Promise.all([badP65Ref.get(), goodP65Ref.get()]);
    
    if (badP65Doc.exists && goodP65Doc.exists) {
        let badData = badP65Doc.data();
        let goodData = goodP65Doc.data();
        let badPhotos = badData.fotoList || [];
        let goodPhotos = goodData.fotoList || [];
        
        // Fix pozoId in photos
        let mergedPhotos = [...goodPhotos];
        for (let photo of badPhotos) {
            photo.idPozo = 'PZ65';
            photo.pozoId = 'PZ65';
            // ensure no duplicates by ID
            if (!mergedPhotos.find(p => p.id === photo.id)) {
                mergedPhotos.push(photo);
            }
        }
        await goodP65Ref.update({ fotoList: mergedPhotos });
        await badP65Ref.delete();
        console.log("Merged and deleted SOPO_PPZ65.");
    }

    // 5. SOPO_PZZ242 -> Delete (SOPO_PZ242 exists and is complete)
    console.log("Deleting SOPO_PZZ242...");
    await db.collection('fichas').doc('SOPO_PZZ242').delete();
    console.log("Deleted SOPO_PZZ242.");

    // 6. SOPO_PZZ299 -> Merge photos to SOPO_PZ299, then delete
    console.log("Merging photos from SOPO_PZZ299 to SOPO_PZ299...");
    const badP299Ref = db.collection('fichas').doc('SOPO_PZZ299');
    const goodP299Ref = db.collection('fichas').doc('SOPO_PZ299');
    const [badP299Doc, goodP299Doc] = await Promise.all([badP299Ref.get(), goodP299Ref.get()]);

    if (badP299Doc.exists && goodP299Doc.exists) {
        let badData = badP299Doc.data();
        let goodData = goodP299Doc.data();
        let badPhotos = badData.fotoList || [];
        let goodPhotos = goodData.fotoList || [];
        
        let mergedPhotos = [...goodPhotos];
        for (let photo of badPhotos) {
            photo.idPozo = 'PZ299';
            photo.pozoId = 'PZ299';
            if (!mergedPhotos.find(p => p.id === photo.id)) {
                mergedPhotos.push(photo);
            }
        }
        await goodP299Ref.update({ fotoList: mergedPhotos });
        await badP299Ref.delete();
        console.log("Merged and deleted SOPO_PZZ299.");
    }

    // 7. SOPO_PZZ70 -> Delete (SOPO_PZ70 exists and is complete)
    console.log("Deleting SOPO_PZZ70...");
    await db.collection('fichas').doc('SOPO_PZZ70').delete();
    console.log("Deleted SOPO_PZZ70.");

    console.log("All fixes applied successfully.");
}

fixPozos().catch(console.error);
