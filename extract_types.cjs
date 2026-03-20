const fs = require('fs');
let catastro = fs.readFileSync('src/types/catastro.ts', 'utf8');

// Rename Sumidero to OOSumidero
catastro = catastro.replace('export interface Sumidero {', 'export interface OOSumidero {');
catastro = catastro.replace('sumideros: Sumidero[];', 'sumideros: OOSumidero[];');

// Get the lines from tmp2.ts
const tmp2 = fs.readFileSync('tmp2.ts', 'utf8').split('\n');
const appStateBlockLines = tmp2.slice(30, 187);

// Add 'export ' to top-level declarations
for(let i=0; i<appStateBlockLines.length; i++) {
   if (appStateBlockLines[i].startsWith('interface ')) {
       appStateBlockLines[i] = 'export ' + appStateBlockLines[i];
   }
   if (appStateBlockLines[i].startsWith('const ')) {
       appStateBlockLines[i] = 'export ' + appStateBlockLines[i];
   }
}

const finalContent = 'import { FotoRegistro } from \'../utils/fotoProcessor\';\n' + catastro + '\n\n' + appStateBlockLines.join('\n');
fs.writeFileSync('src/types/catastro.ts', finalContent);
console.log('Done!');
