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

async function checkPhoto() {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/fichas/ANAPOIMA_PZ003`;
    
    try {
        const doc = await request('GET', url);
        const fields = doc.fields || {};
        const fotoList = fields.fotoList?.arrayValue?.values || [];
        
        console.log("=== FOTOS EN ANAPOIMA_PZ003 ===");
        fotoList.forEach(v => {
            const f = v.mapValue.fields;
            const filename = f.filename?.stringValue;
            const driveId = f.driveId?.stringValue || 'N/A';
            const hasBlob = f.blobId?.stringValue ? 'SI' : 'NO';
            const isExcluido = f.esExcluido?.booleanValue;
            
            if (filename === 'PZ003-I.JPG') {
                console.log(`FOTO: ${filename} | DriveID: ${driveId} | HasBlob: ${hasBlob} | Excluido: ${isExcluido} | ID: ${f.id?.stringValue}`);
            }
        });

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

checkPhoto();
