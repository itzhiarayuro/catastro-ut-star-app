const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'catastro-ut-star';
const TOKEN_PATH = 'C:\\Users\\ICA2025\\.config\\configstore\\firebase-tools.json';

function getAccessToken() {
    try {
        const data = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        if (data.tokens && data.tokens.access_token) {
            return data.tokens.access_token;
        }
        throw new Error('Token not found in config');
    } catch (error) {
        console.error('Error reading token:', error.message);
        process.exit(1);
    }
}

async function request(method, url, data) {
    return new Promise((resolve, reject) => {
        const token = getAccessToken();
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve(body); }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function audit() {
    // We'll use structured query to query historial_fichas
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const queryPayload = {
        structuredQuery: {
            from: [{ collectionId: 'historial_fichas' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        { fieldFilter: { field: { fieldPath: 'pozo' }, op: 'EQUAL', value: { stringValue: 'PZ003' } } },
                        { fieldFilter: { field: { fieldPath: 'municipio' }, op: 'EQUAL', value: { stringValue: 'ANAPOIMA' } } }
                    ]
                }
            }
        }
    };

    try {
        const results = await request('POST', url, queryPayload);
        
        console.log("=== AUDIT LOG PZ003 ANAPOIMA ===");
        
        results.forEach(res => {
            if (!res.document) return;
            const doc = res.document;
            const fields = doc.fields || {};
            
            const timestamp = fields.savedAt?.stringValue || fields.lastSync?.stringValue || 'N/A';
            const user = fields.creatorEmail?.stringValue || fields.createdBy?.stringValue || 'Unknown';
            const action = fields.action?.stringValue || 'SAVED'; // maybe doesn't have action
            const deleted = fields.deleted?.booleanValue;
            
            // Look for PZ003-I.JPG in fotoList
            let pz003i_status = 'NO EXISTE';
            if (fields.fotoList && fields.fotoList.arrayValue && fields.fotoList.arrayValue.values) {
                const fotos = fields.fotoList.arrayValue.values.map(f => f.mapValue.fields);
                const found = fotos.find(f => f.filename?.stringValue === 'PZ003-I.JPG');
                if (found) {
                    const isExcluido = found.esExcluido?.booleanValue;
                    pz003i_status = `ENCONTRADA (excluido: ${isExcluido})`;
                }
            } else if (fields.fotoList && fields.fotoList.arrayValue && !fields.fotoList.arrayValue.values) {
                 pz003i_status = 'VACIO';
            }

            console.log(`[${timestamp}] User: ${user} | DocDeleted: ${deleted} | Foto PZ003-I: ${pz003i_status} | ID: ${doc.name.split('/').pop()}`);
        });

    } catch (e) {
        console.error("Query failed:", e);
    }
}

audit();
