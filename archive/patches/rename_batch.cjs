const fs = require('fs');

async function main() {
    const configPath = 'C:\\Users\\ICA2025\\.config\\configstore\\firebase-tools.json';
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = configData.tokens.access_token;
    const projectId = 'catastro-ut-star';
    
    const pozos = ['P04', 'P05', 'P11', 'P12', 'P41', 'P69', 'P70', 'P71', 'P200'];
    
    for (const pozo of pozos) {
        const oldId = `SOPO_${pozo}`;
        const newPozo = `PZ${pozo.substring(1)}`;
        const newId = `SOPO_${newPozo}`;
        
        console.log(`Processing ${oldId} -> ${newId}...`);

        const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${oldId}`;
        const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas?documentId=${newId}`;
        const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${oldId}`;

        try {
            const resGet = await fetch(getUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!resGet.ok) {
                console.log(`Skipping ${oldId}: not found or error (${resGet.status})`);
                continue;
            }
            
            const doc = await resGet.json();
            
            // Update internal 'pozo' field
            if (doc.fields && doc.fields.pozo) {
                doc.fields.pozo.stringValue = newPozo;
            }

            // Create new
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
                continue;
            }

            // Delete old
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
            console.error(`Error on ${pozo}:`, e.message);
        }
    }
}

main();
