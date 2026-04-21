const fs = require('fs');
const design = JSON.parse(fs.readFileSync('plantilla-clean.json', 'utf8'));

const images = design.shapes.filter(s => s.type === 'image');
console.log('Total images:', images.length);
if (images.length > 0) {
    const img1 = images[0];
    console.log('Image keys:', Object.keys(img1));
    console.log('url prefix:', img1.url ? img1.url.substring(0, 50) : 'no url');
}

// Check texts for alignment issues
const texts = design.shapes.filter(s => s.type === 'text');
console.log('Total texts:', texts.length);
if (texts.length > 0) {
    console.log('Sample text keys:', Object.keys(texts[0]));
    console.log('Sample text align:', texts[0].align || texts[0].textAlign);
}
