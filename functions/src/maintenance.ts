import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const fixOrdenInExistingFichas = functions.runWith({
    timeoutSeconds: 540,
    memory: "512MB"
}).https.onRequest(async (req, res) => {
    try {
        const db = admin.firestore();
        const collections = ["fichas", "historial_fichas"];
        let totalUpdated = 0;
        const processedIds: string[] = [];
        for (const collName of collections) {
            const snapshot = await db.collection(collName).get();
            const batchSize = 100;
            let batch = db.batch();
            let currentBatchCount = 0;
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const updatePayload: any = {};
                let hasChanges = false;
                if (Array.isArray(data.pipes) && data.pipes.length > 0) {
                    updatePayload.pipes = data.pipes.map((p: any, idx: number) => ({ orden: idx + 1, ...p }));
                    hasChanges = true;
                }
                if (Array.isArray(data.sums) && data.sums.length > 0) {
                    updatePayload.sums = data.sums.map((s: any, idx: number) => ({ orden: idx + 1, ...s }));
                    hasChanges = true;
                }
                if (hasChanges) {
                    batch.update(doc.ref, updatePayload);
                    currentBatchCount++;
                    totalUpdated++;
                    processedIds.push(`${collName}/${doc.id}`);
                    if (currentBatchCount >= batchSize) {
                        await batch.commit();
                        batch = db.batch();
                        currentBatchCount = 0;
                    }
                }
            }
            if (currentBatchCount > 0) {
                await batch.commit();
            }
        }
        res.status(200).send({
            success: true,
            totalUpdated,
            processedIds: processedIds.slice(0, 50),
            msg: `Se forzó la actualización de ${totalUpdated} documentos.`
        });
    }
    catch (error: any) {
        res.status(500).send({ success: false, error: error.message });
    }
});
