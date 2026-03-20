import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

function toRestFormat(data: any): any {
    if (data === null || data === undefined)
        return { nullValue: null };
    const type = typeof data;
    if (type === "string")
        return { stringValue: data };
    if (type === "number") {
        if (Number.isInteger(data))
            return { integerValue: data.toString() };
        return { doubleValue: data };
    }
    if (type === "boolean")
        return { booleanValue: data };
    if (data instanceof Date)
        return { timestampValue: data.toISOString() };
    if (data instanceof admin.firestore.Timestamp)
        return { timestampValue: data.toDate().toISOString() };
    if (Array.isArray(data)) {
        return {
            arrayValue: {
                values: data.map((item: any) => toRestFormat(item))
            }
        };
    }
    if (type === "object") {
        const fields: any = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === "string" && value.length > 50000)
                continue;
            fields[key] = toRestFormat(value);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(data) };
}

export const firestoreProxy = functions.runWith({
    memory: "512MB",
    timeoutSeconds: 120
}).https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    try {
        const collectionName = req.query.coleccion as string;
        const pageToken = req.query.pageToken as string;
        const limitStr = (req.query.limit as string) || "100";
        const limitSetting = parseInt(limitStr);
        const limit = isNaN(limitSetting) ? 100 : Math.min(limitSetting, 500);
        const allowed = ["fichas", "marcaciones", "historial_fichas", "historial_marcaciones"];
        if (!collectionName || !allowed.includes(collectionName)) {
            res.status(403).json({ error: "Colección no permitida o no especificada." });
            return;
        }
        let query: any = admin.firestore().collection(collectionName).orderBy(admin.firestore.FieldPath.documentId());
        if (pageToken) {
            const startDoc = await admin.firestore().collection(collectionName).doc(pageToken).get();
            if (startDoc.exists) {
                query = query.startAfter(startDoc);
            }
        }
        const snapshot = await query.limit(limit).get();
        const documents = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const fields: any = {};
            for (const [key, value] of Object.entries(data)) {
                if (key === 'fotoList' || key === 'fotos' || key === 'photos')
                    continue;
                if (typeof value === "string" && value.length > 5000)
                    continue;
                fields[key] = toRestFormat(value);
            }
            return {
                name: `projects/catastro-ut-star/databases/(default)/documents/${collectionName}/${doc.id}`,
                fields: fields,
                createTime: doc.createTime ? doc.createTime.toDate().toISOString() : new Date().toISOString(),
                updateTime: doc.updateTime ? doc.updateTime.toDate().toISOString() : new Date().toISOString()
            };
        });
        let nextPageToken: string | undefined = undefined;
        if (snapshot.docs.length === limit) {
            nextPageToken = snapshot.docs[snapshot.docs.length - 1].id;
        }
        res.status(200).json({
            documents,
            nextPageToken
        });
    }
    catch (error: any) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: error.message });
    }
});
