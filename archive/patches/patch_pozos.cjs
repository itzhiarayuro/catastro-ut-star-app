const fs = require('fs');

async function main() {
    // Read token
    const configPath = 'C:\\Users\\ICA2025\\.config\\configstore\\firebase-tools.json';
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = configData.tokens.access_token;
    
    const pozosToUpdate = [
        'P03', 'P22', 'P238', 'P241', 'P245', 'P40', 'P59', 'P60', 'P68', 'P70', 'P71', 'PP01', 'PZ07', 'PZ09', 'PZ1034', 'PZ104', 'PZ106', 'PZ1080', 'PZ1096', 'PZ110', 'PZ19', 'PZ257A', 'PZ29', 'PZCANO2'
    ];
    
    let successCount = 0;
    
    for (const pozo of pozosToUpdate) {
        const docId = `SOPO_${pozo}`;
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
                            stringValue: "PENDIENTE"
                        }
                    }
                })
            });
            
            if (res.ok) {
                console.log(`Updated ${docId} successfully`);
                successCount++;
            } else {
                const errText = await res.text();
                if (res.status === 404) {
                    console.log(`Document ${docId} not found (404)`);
                } else {
                    console.error(`Failed to update ${docId}: ${res.status} ${errText}`);
                }
            }
        } catch(e) {
            console.error(`Error updating ${docId}:`, e.message);
        }
    }
    
    console.log(`Finished. Successfully updated ${successCount} documents.`);
}

main();
