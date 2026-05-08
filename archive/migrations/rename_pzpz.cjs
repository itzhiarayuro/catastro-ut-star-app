const fs = require('fs');

async function main() {
    const configPath = 'C:\\Users\\ICA2025\\.config\\configstore\\firebase-tools.json';
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = configData.tokens.access_token;
    const projectId = 'catastro-ut-star';
    
    const oldId = 'SOPO_PZPZ287';
    const newPozo = 'PZ287';
    const newId = 'SOPO_PZ287';
    
    console.log(`Renaming ${oldId} to ${newId}...`);

    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${oldId}`;
    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas?documentId=${newId}`;
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${oldId}`;

    try {
        const resGet = await fetch(getUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!resGet.ok) {
            console.error(`Error fetching ${oldId}: ${resGet.status}`);
            return;
        }
        
        const doc = await resGet.json();
        
        if (doc.fields && doc.fields.pozo) {
            doc.fields.pozo.stringValue = newPozo;
        }

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

        const resDelete = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resDelete.ok) {
            console.error(`Error deleting ${oldId}: ${resDelete.status}`);
        } else {
            console.log(`Successfully renamed ${oldId} to ${newId}`);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
