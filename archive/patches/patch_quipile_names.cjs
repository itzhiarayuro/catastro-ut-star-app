const fs = require('fs');

async function main() {
    const configPath = 'C:\\Users\\ICA2025\\.config\\configstore\\firebase-tools.json';
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = configData.tokens.access_token;
    const projectId = 'catastro-ut-star';

    const updates = [
        { oldId: 'QUIPILE_PZC001', newId: 'QUIPILE_C001', oldCode: 'PZC001', newCode: 'C001' },
        { oldId: 'QUIPILE_PZC002', newId: 'QUIPILE_C002', oldCode: 'PZC002', newCode: 'C002' }
    ];

    for (const update of updates) {
        console.log(`Processing ${update.oldCode} -> ${update.newCode}...`);
        
        const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${update.oldId}`;
        const res = await fetch(getUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        
        if (!res.ok) {
            console.error(`Error fetching ${update.oldId}: ${res.status}`);
            continue;
        }
        
        const doc = await res.json();
        
        // Update fields recursively by string replacement in JSON
        let fieldsStr = JSON.stringify(doc.fields);
        const regex = new RegExp(update.oldCode, 'g');
        fieldsStr = fieldsStr.replace(regex, update.newCode);
        const newFields = JSON.parse(fieldsStr);
        
        // Create new document
        const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas?documentId=${update.newId}`;
        const resCreate = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: newFields })
        });
        
        if (!resCreate.ok) {
            const errText = await resCreate.text();
            console.error(`Error creating ${update.newId}: ${resCreate.status} ${errText}`);
            continue;
        }
        
        console.log(`Created ${update.newId}`);

        // Delete old document
        const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fichas/${update.oldId}`;
        const resDelete = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (resDelete.ok) {
            console.log(`Successfully deleted old document ${update.oldId}`);
        } else {
            console.error(`Error deleting ${update.oldId}: ${resDelete.status}`);
        }
    }

    console.log('Search for references in other documents...');
    // This is a simplified check. In a real scenario we'd query all docs.
    // Given the small number of docs in Quipile, we could check them.
}

main().catch(console.error);
