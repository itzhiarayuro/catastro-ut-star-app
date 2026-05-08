const fs = require('fs');

async function main() {
    // Read token
    const configPath = 'C:\\Users\\ICA2025\\.config\\configstore\\firebase-tools.json';
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = configData.tokens.access_token;
    
    // The doc ID is SOPO_PP01 as modified previously
    const docId = 'SOPO_PP01';
    const url = `https://firestore.googleapis.com/v1/projects/catastro-ut-star/databases/(default)/documents/fichas/${docId}?updateMask.fieldPaths=municipio`;
    
    try {
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    municipio: {
                        stringValue: "MARINILLA"
                    }
                }
            })
        });
        
        if (res.ok) {
            console.log(`Updated ${docId} successfully`);
        } else {
            const errText = await res.text();
            console.error(`Failed to update ${docId}: ${res.status} ${errText}`);
        }
    } catch(e) {
        console.error(`Error updating ${docId}:`, e.message);
    }
}

main();
