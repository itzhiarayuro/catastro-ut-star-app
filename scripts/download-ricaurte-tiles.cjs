const fs = require('fs');
const https = require('https');
const path = require('path');

const center = { lat: 4.2822, lng: -74.7724 }; // Ricaurte, Cundinamarca

const toQuadKey = (x, y, z) => {
    let quadKey = '';
    for (let i = z; i > 0; i--) {
        let digit = 0;
        const mask = 1 << (i - 1);
        if ((x & mask) !== 0) digit += 1;
        if ((y & mask) !== 0) digit += 2;
        quadKey += digit.toString();
    }
    return quadKey;
};

// Vamos a descargar niveles 13, 14, 15 y 16
const zooms = [13, 14, 15, 16];

const getGrid = (z) => {
    if (z === 13) return 2;
    if (z === 14) return 4;
    if (z === 15) return 8;
    if (z === 16) return 16;
    return 1;
};

const tilesToDownload = [];

zooms.forEach(z => {
    const xCenter = Math.floor((center.lng + 180) / 360 * Math.pow(2, z));
    const yCenter = Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    const grid = getGrid(z);

    for (let dx = -grid; dx <= grid; dx++) {
        for (let dy = -grid; dy <= grid; dy++) {
            tilesToDownload.push({ z, x: xCenter + dx, y: yCenter + dy });
        }
    }
});

console.log(`Total de tiles a descargar: ${tilesToDownload.length}`);

const results = {};

const downloadTile = (tile) => {
    return new Promise((resolve) => {
        const quadKey = toQuadKey(tile.x, tile.y, tile.z);
        const url = `https://ecn.t3.tiles.virtualearth.net/tiles/a${quadKey}.jpeg?g=1`;
        
        https.get(url, (res) => {
            const data = [];
            res.on('data', (chunk) => {
                data.push(chunk);
            });
            res.on('end', () => {
                const buffer = Buffer.concat(data);
                const base64 = buffer.toString('base64');
                const key = `sat_${tile.z}_${tile.x}_${tile.y}`;
                results[key] = `data:image/jpeg;base64,${base64}`;
                resolve();
            });
        }).on('error', (err) => {
            console.error(`Error bajando tile ${tile.z} ${tile.x} ${tile.y}`, err);
            resolve();
        });
    });
};

const run = async () => {
    let count = 0;
    const CHUNK_SIZE = 10;
    for (let i = 0; i < tilesToDownload.length; i += CHUNK_SIZE) {
        const chunk = tilesToDownload.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(tile => downloadTile(tile)));
        count += chunk.length;
        if (count % 100 === 0) console.log(`Descargando... ${count} / ${tilesToDownload.length}`);
    }
    
    const outPath = path.join(__dirname, '../public/ricaurte-satellite.json');
    fs.writeFileSync(outPath, JSON.stringify(results));
    console.log(`Guardado exitosamente en ${outPath}`);
    console.log(`Tamaño aprox del archivo: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
};

run();
