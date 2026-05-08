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
    } catch (e) {
        console.error("Error leyendo directorio: " + dir, e.message);
    }
    return results;
}

console.log("Escaneando archivos en " + targetDir + "...");
const allFiles = walk(targetDir);
console.log(`Se encontraron ${allFiles.length} archivos en total.`);

const dirMap = {};

for (const file of allFiles) {
    const dir = path.dirname(file);
    const basename = path.basename(file);
    const ext = path.extname(basename);
    const nameWithoutExt = path.basename(basename, ext);
    
    // Match " (x)" or "(x)" at the end of the filename
    // Example: "PZ267-T (1)" -> match[1] = "PZ267-T"
    const match = nameWithoutExt.match(/(.*?)\s*\([^)]+\)$/);
    
    if (!dirMap[dir]) dirMap[dir] = { existing: new Set(), incoming: {} };
    dirMap[dir].existing.add(basename.toLowerCase());
    
    if (match) {
        // Only if it's not empty after stripping.
        if (match[1].trim().length > 0) {
            const newName = match[1].trim() + ext;
            if (!dirMap[dir].incoming[newName.toLowerCase()]) {
                dirMap[dir].incoming[newName.toLowerCase()] = [];
            }
            dirMap[dir].incoming[newName.toLowerCase()].push({
                original: basename,
                target: newName
            });
        }
    }
}

let table = "| Carpeta | Archivo Original | Nombre Normalizado (Destino) | Motivo del Conflicto |\n|---|---|---|---|\n";
let conflictCount = 0;

for (const dir in dirMap) {
    const data = dirMap[dir];
    for (const newNameLower in data.incoming) {
        const items = data.incoming[newNameLower];
        // Does the target already exist natively? (not counting the incoming ones)
        // Wait, the target name might be one of the files we are processing, but `data.existing` contains ALL files.
        const destExists = data.existing.has(newNameLower);
        
        if (destExists || items.length > 1) {
            for (const item of items) {
                let reason = [];
                if (destExists) reason.push("El archivo destino ya existe");
                if (items.length > 1) reason.push(`Múltiples archivos intentan renombrarse a este mismo nombre (${items.length} archivos)`);
                table += `| ${dir} | ${item.original} | ${item.target} | ${reason.join(' y ')} |\n`;
                conflictCount++;
            }
        }
    }
}

if (conflictCount > 0) {
    fs.writeFileSync('conflictos_fotos.md', "## Inventario de Conflictos de Renombramiento\n\n" + table);
    console.log(`Se encontraron ${conflictCount} posibles conflictos. Se ha guardado la tabla en conflictos_fotos.md`);
} else {
    console.log("No se encontraron conflictos.");
}
