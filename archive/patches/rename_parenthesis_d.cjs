const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\\\2.OTROS\\\\copia fotos app\\\\copia 2\\\\FICHAS-EPC-PDA';

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

console.log("Escaneando archivos en D: para quitar paréntesis...");
const allFiles = walk(targetDir);

const dirMap = {};

// Fase 1: Mapear todos los archivos para detectar conflictos
for (const file of allFiles) {
    const dir = path.dirname(file);
    const basename = path.basename(file);
    const ext = path.extname(basename);
    const nameWithoutExt = path.basename(basename, ext);
    
    // Buscar patrón tipo " (1)" o "(x)" al final
    const match = nameWithoutExt.match(/(.*?)\s*\([^)]+\)$/);
    
    if (!dirMap[dir]) dirMap[dir] = { existing: new Set(), incoming: {} };
    dirMap[dir].existing.add(basename.toLowerCase());
    
    if (match && match[1].trim().length > 0) {
        const newName = match[1].trim() + ext;
        if (!dirMap[dir].incoming[newName.toLowerCase()]) {
            dirMap[dir].incoming[newName.toLowerCase()] = [];
        }
        dirMap[dir].incoming[newName.toLowerCase()].push({
            originalPath: file,
            originalName: basename,
            targetName: newName,
            targetPath: path.join(dir, newName)
        });
    }
}

let renamedCount = 0;
let skippedCount = 0;

console.log("\nIniciando proceso de renombrado en D:...");

for (const dir in dirMap) {
    const data = dirMap[dir];
    for (const newNameLower in data.incoming) {
        const items = data.incoming[newNameLower];
        const destExists = data.existing.has(newNameLower);
        
        if (destExists || items.length > 1) {
            // Conflicto: o el destino ya existe, o varios archivos quieren llamarse igual
            items.forEach(i => {
                console.log(`[CONFLICTO] Omitido: ${i.originalName} en ${dir} (el destino ya existe)`);
                skippedCount++;
            });
        } else {
            // No hay conflicto
            const item = items[0];
            try {
                fs.renameSync(item.originalPath, item.targetPath);
                // console.log(`[OK] Renombrado: ${item.originalName} -> ${item.targetName}`);
                renamedCount++;
            } catch (err) {
                console.error(`[ERROR] Falló renombrado de ${item.originalPath}: ${err.message}`);
            }
        }
    }
}

console.log(`\n==============================================`);
console.log(`RESUMEN DEL PROCESO EN D:`);
console.log(`Total archivos renombrados con éxito: ${renamedCount}`);
console.log(`Total archivos omitidos por conflicto: ${skippedCount}`);
console.log(`==============================================\n`);
