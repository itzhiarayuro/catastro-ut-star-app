const fs = require('fs');
const path = require('path');

const photosBaseDir = 'H:\\Unidades compartidas\\ICYA\\FICHAS-EPC-PDA';

const foldersToRename = [
    { municipio: 'SIBATE', oldFolder: 'PZC120A', newFolder: 'C120A' },
    { municipio: 'SIBATE', oldFolder: 'PZC120B', newFolder: 'C120B' },
    { municipio: 'SIBATE', oldFolder: 'PZPZ13A', newFolder: 'PZ13A' },
    { municipio: 'SIBATE', oldFolder: 'PZC1086', newFolder: 'C1086' },
    { municipio: 'SIBATE', oldFolder: 'PZPZ1031', newFolder: 'PZ1031' },
    { municipio: 'SIBATE', oldFolder: 'PZC1078A', newFolder: 'C1078A' },
    { municipio: 'RICAURTE', oldFolder: 'PZC001', newFolder: 'C001' },
    { municipio: 'RICAURTE', oldFolder: 'PZC002', newFolder: 'C002' },
    { municipio: 'RICAURTE', oldFolder: 'PZC003', newFolder: 'C003' },
    { municipio: 'RICAURTE', oldFolder: 'PZC004', newFolder: 'C004' }
];

console.log("=== INICIANDO RENOMBRADO LOCAL DE CARPETAS Y ARCHIVOS ===");

foldersToRename.forEach(({ municipio, oldFolder, newFolder }) => {
    const catastroDir = path.join(photosBaseDir, municipio, 'CATASTRO');
    const oldPath = path.join(catastroDir, oldFolder);
    const newPath = path.join(catastroDir, newFolder);
    
    if (fs.existsSync(oldPath)) {
        try {
            // Renombrar los archivos dentro primero
            const files = fs.readdirSync(oldPath);
            let filesRenamed = 0;
            
            files.forEach(file => {
                const filePath = path.join(oldPath, file);
                if (fs.statSync(filePath).isFile()) {
                    let newFileName = file;
                    // Reemplazo exacto del prefijo viejo por el nuevo si el archivo contiene el nombre viejo
                    const oldRegex = new RegExp(oldFolder, 'i');
                    if (oldRegex.test(file)) {
                        newFileName = file.replace(oldRegex, newFolder);
                    } else if (file.toUpperCase().startsWith('PZC')) {
                        newFileName = file.replace(/^PZC/i, 'C');
                    } else if (file.toUpperCase().startsWith('PZPZ')) {
                        newFileName = file.replace(/^PZPZ/i, 'PZ');
                    }
                    
                    if (newFileName !== file) {
                        const newFilePath = path.join(oldPath, newFileName);
                        fs.renameSync(filePath, newFilePath);
                        filesRenamed++;
                    }
                }
            });
            
            // Renombrar la carpeta
            fs.renameSync(oldPath, newPath);
            console.log(`[EXITO] ${municipio}: Renombrada carpeta "${oldFolder}" -> "${newFolder}" (${filesRenamed} fotos/archivos internos actualizados)`);
        } catch (e) {
            console.error(`[ERROR] ${municipio}: Falló al procesar "${oldFolder}". Motivo: ${e.message}`);
        }
    } else {
        console.log(`[OMITIDO] ${municipio}: La carpeta "${oldFolder}" no existe en ${catastroDir}.`);
    }
});

console.log("\nProceso finalizado.");
