const fetch = require('node-fetch');
const fflate = require('fflate');

async function test() {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyJQamjf4n64SZoBpwnIAzsukFDGh70x6VbuQIU367rp8MuKQZR3gq3xXWdmwVHNroS/exec';
    const SECRET_TOKEN = 'STAR-2025-VIP-SYNC';

    const testFileContent = Buffer.from('Antigravity Test Image Content');
    const zipData = {
        'SOPÓ-TEST-P.JPG': new Uint8Array(testFileContent)
    };

    const zipped = fflate.zipSync(zipData);
    const zipBase64 = Buffer.from(zipped).toString('base64');

    const payload = {
        token: SECRET_TOKEN,
        zipData: zipBase64,
        metadata: [{
            id: 'test_' + Date.now(),
            filename: 'SOPÓ-TEST-P.JPG',
            municipio: 'SOPÓ',
            pozoId: 'TEST-AI-999',
            barrio: 'BARRIO CENTRAL',
            categoria: 'General',
            inspector: 'AI Antigravity'
        }]
    };

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        const text = await res.text();
        console.log('Response:', text);
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
