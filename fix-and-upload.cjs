const fs = require('fs');
const path = require('path');

// Find the plantilla file
const files = fs.readdirSync('.').filter(f => f.includes('plantilla') && f.endsWith('.json'));
console.log('Found plantilla files:', files);

if (files.length === 0) {
    console.error('No plantilla file found!');
    process.exit(1);
}

const filename = files[0];
console.log('Using:', filename);

let raw = fs.readFileSync(filename, 'utf8');

// Count and replace all "transparent" values
const count = (raw.match(/"transparent"/gi) || []).length;
console.log(`Found ${count} occurrences of "transparent"`);

// Replace "transparent" with null (remove the color entirely from the data)
// This way jsPDF will never receive "transparent" as a color value
raw = raw.replace(/"transparent"/gi, 'null');

const data = JSON.parse(raw);
console.log('JSON parsed OK');
console.log('Shapes:', data.shapes?.length);
console.log('Placements:', data.placements?.length);

// Also sanitize the data by walking through shapes and removing null colors
function sanitizeColors(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeColors);

    const colorKeys = ['fillColor', 'strokeColor', 'color', 'borderColor', 'labelColor', 'labelBackgroundColor'];
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (colorKeys.includes(key) && (value === null || value === 'transparent' || value === 'none')) {
            // Skip null/transparent colors entirely - don't include them
            continue;
        }
        result[key] = sanitizeColors(value);
    }
    return result;
}

const cleanData = sanitizeColors(data);

// Verify no transparent remains
const cleanStr = JSON.stringify(cleanData);
const remaining = (cleanStr.match(/transparent/gi) || []).length;
console.log(`After cleanup: ${remaining} occurrences of "transparent" remain`);

// Write cleaned file
fs.writeFileSync('plantilla-clean.json', JSON.stringify(cleanData, null, 2), 'utf8');
console.log('Wrote plantilla-clean.json');
process.exit(0);
