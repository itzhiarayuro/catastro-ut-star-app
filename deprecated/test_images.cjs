const fs = require('fs');
const design = JSON.parse(fs.readFileSync('plantilla-clean.json', 'utf8'));

const images = design.shapes.filter(s => s.type === 'image');
if (images.length > 0) {
    console.log(images[0].imageUrl.substring(0, 50));
}
