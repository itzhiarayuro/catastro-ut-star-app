const fs = require('fs');
const path = require('path');

const baseDir = 'H:\\\\Unidades compartidas\\\\ICYA\\\\FICHAS-EPC-PDA';
const muns = ['GRANADA', 'SIBATE', 'SOPO'];

let deletedCount = 0;
let renamedCount = 0;

function processFolder(dir) {
    try {
        const files = fs.readdirSync(dir);
        const groups = {};

        files.forEach(file => {
            const filePath = path.join(dir, file);
            let stats;
            try { stats = fs.statSync(filePath); } catch(e) { return; }
            
            if (stats.isDirectory()) {
                processFolder(filePath); 
                return;
            }

            const ext = path.extname(file);
            const name = path.basename(file, ext);
            
            // Regex para detectar (x) al final del nombre
            const match = name.match(/^(.*?)\s*\((\d+)\)$/);
            let baseName, index;
            
            if (match) {
                baseName = match[1].trim();
                index = parseInt(match[2]);
            } else {
                baseName = name.trim();
                index = 0;
            }

            const key = baseName.toLowerCase() + ext.toLowerCase();
            if (!groups[key]) groups[key] = [];
            groups[key].push({ file, index, fullPath: filePath, baseName, ext });
        });

        Object.keys(groups).forEach(key => {
            const items = groups[key];
            if (items.length > 1) {
                // Ordenar por índice DESC (el más alto primero)
                items.sort((a, b) => b.index - a.index);
                
                const winner = items[0];
                const losers = items.slice(1);

                // 1. Eliminar versiones inferiores
                losers.forEach(loser => {
                    try {
                        fs.unlinkSync(loser.fullPath);
                        deletedCount++;
                    } catch (e) {
                        console.error(`Error eliminando ${loser.file}: ${e.message}`);
                    }
                });

                // 2. Renombrar el más alto al nombre base
                const finalPath = path.join(dir, winner.baseName + winner.ext);
                if (winner.fullPath !== finalPath) {
                    try {
                        // Por seguridad, si el destino existe (que no debería tras el unlink), lo quitamos
                        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
                        fs.renameSync(winner.fullPath, finalPath);
                        renamedCount++;
                    } catch (e) {
                        console.error(`Error renombrando ${winner.file} -> ${winner.baseName}${winner.ext}: ${e.message}`);
                    }
                }
            }
        });
    } catch(e) {}
}

console.log("Iniciando limpieza profunda de versiones (H: Drive)...");
muns.forEach(mun => {
    const catastroPath = path.join(baseDir, mun, 'CATASTRO');
    if (fs.existsSync(catastroPath)) {
        console.log(`Procesando ${mun}...`);
        processFolder(catastroPath);
    } else {
        console.log(`Ruta no encontrada para ${mun}: ${catastroPath}`);
    }
});

console.log(`\n==============================================`);
console.log(`LIMPIEZA COMPLETADA EN GRANADA, SIBATE Y SOPO`);
console.log(`- Versiones antiguas eliminadas: ${deletedCount}`);
console.log(`- Fotos actualizadas a la versión más reciente: ${renamedCount}`);
console.log(`==============================================\n`);
