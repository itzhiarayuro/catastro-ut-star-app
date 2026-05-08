const fs = require('fs');

async function main() {
    const configPath = 'C:\\Users\\ICA2025\\.config\\configstore\\firebase-tools.json';
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = configData.tokens.access_token;
    
    const oldId = 'SOPO_P01';
    const newId = 'SOPO_PZ01';
    const projectId = 'catastro-ut-star';
    
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${oldId}`;
    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas?documentId=${newId}`;
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${oldId}`;

    try {
        // 1. Get the document
        const resGet = await fetch(getUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!resGet.ok) {
            console.error(`Error fetching ${oldId}: ${resGet.status} ${await resGet.text()}`);
            return;
        }
        
        const doc = await resGet.json();
        
        // Update the 'pozo' field in the data
        if (doc.fields && doc.fields.pozo) {
            doc.fields.pozo.stringValue = 'PZ01';
        }

        // 2. Create the new document
        const resCreate = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: doc.fields })
        });

        if (!resCreate.ok) {
            console.error(`Error creating ${newId}: ${resCreate.status} ${await resCreate.text()}`);
            return;
        }
        
        console.log(`Created ${newId} successfully`);

        // 3. Delete the old document
        const resDelete = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resDelete.ok) {
            console.error(`Error deleting ${oldId}: ${resDelete.status} ${await resDelete.text()}`);
            return;
        }
        
        console.log(`Deleted ${oldId} successfully`);
        console.log(`Rename from ${oldId} to ${newId} completed.`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
