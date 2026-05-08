const fs = require('fs');
const path = require('path');

const targetDir = 'H:\\Unidades compartidas\\ICYA\\FICHAS-EPC-PDA';

function walk(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
            const stat = fs.statSync(path.join(dir, file));
            if (stat && stat.isDirectory()) {
                results = results.concat(walk(path.join(dir, file)));
            } else {
                results.push(path.join(dir, file));
            }
        }
    } catch (e) {}
    return results;
}

const allFiles = walk(targetDir);
let count = 0;
for (const file of allFiles) {
    const basename = path.basename(file);
    if (basename.includes('(')) {
        console.log(file);
        count++;
    }
}
console.log("Total files with parenthesis: " + count);
