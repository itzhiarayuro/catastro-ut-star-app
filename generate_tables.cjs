const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const photosBaseDir = 'H:\\Unidades compartidas\\ICYA\\FICHAS-EPC-PDA';

async function generateTables() {
  // 1. Obtener pozos de Firebase
  const snapshot = await db.collection('fichas').get();
  const firebasePozos = new Map(); // key: MUN_POZO_UPPER, value: { municipio, pozo }
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.pozo) {
        // En los IDs a veces viene con otro formato, usaremos el campo 'pozo' y el municipio derivado del ID o campo
        const mun = doc.id.split('_')[0].toUpperCase().trim();
        const poz = String(data.pozo).toUpperCase().trim();
        
        firebasePozos.set(`${mun}_${poz}`, {
            municipio: mun,
            pozo: data.pozo
        });
    }
  });

  // 2. Obtener carpetas locales
  const localFolders = new Map(); // key: MUN_FOLDER_UPPER, value: { municipio, folder }
  
  let municipiosCarpetas = [];
  try {
      municipiosCarpetas = fs.readdirSync(photosBaseDir).filter(f => fs.statSync(path.join(photosBaseDir, f)).isDirectory());
  } catch (e) {
      console.log("Error leyendo base de fotos", e);
      return;
  }

  municipiosCarpetas.forEach(mun => {
      try {
          const catastroDir = path.join(photosBaseDir, mun, 'CATASTRO');
          if (fs.existsSync(catastroDir)) {
              const pozosDir = fs.readdirSync(catastroDir).filter(f => fs.statSync(path.join(catastroDir, f)).isDirectory());
              
              pozosDir.forEach(folder => {
                  const m = mun.toUpperCase().trim();
                  const f = folder.toUpperCase().trim();
                  localFolders.set(`${m}_${f}`, {
                      municipio: mun.toUpperCase(),
                      folder: folder
                  });
              });
          }
      } catch (e) {}
  });

  // 3. Generar Tabla 1: Carpetas Locales sin Firebase
  const table1 = [];
  for (const [key, local] of localFolders.entries()) {
      // Buscar match exacto o sin espacios
      const keyNoSpaces = `${local.municipio}_${local.folder.toUpperCase().replace(/\s+/g, '')}`;
      
      let found = firebasePozos.has(key);
      if (!found) found = firebasePozos.has(keyNoSpaces);
      
      if (!found) {
          table1.push(local);
      }
  }

  // 4. Generar Tabla 2: Firebase sin Carpeta Local
  const table2 = [];
  for (const [key, fb] of firebasePozos.entries()) {
      const keyNoSpaces = `${fb.municipio}_${fb.pozo.toUpperCase().replace(/\s+/g, '')}`;
      
      let found = localFolders.has(key);
      if (!found) found = localFolders.has(keyNoSpaces);
      
      // Intentar buscar fuzzy match si es necesario? Mejor solo exacto.
      if (!found) {
          table2.push(fb);
      }
  }

  // Escribir a Markdown
  let md = `# Reporte de Discrepancias CATASTRO\n\n`;
  
  md += `## Tabla 1: Carpetas Locales SIN registro en Firebase\n`;
  md += `*Son carpetas físicas en el Drive, pero no existe un pozo con ese código en la base de datos.*\n\n`;
  md += `| Municipio | Nombre de Carpeta |\n`;
  md += `|---|---|\n`;
  
  // Ordenar por municipio
  table1.sort((a, b) => a.municipio.localeCompare(b.municipio));
  table1.forEach(item => {
      md += `| ${item.municipio} | ${item.folder} |\n`;
  });
  if (table1.length === 0) md += `| N/A | Todo Perfecto |\n`;

  md += `\n\n## Tabla 2: Registros de Firebase SIN Carpeta Local\n`;
  md += `*Son pozos creados en la app (Firebase) que no tienen su respectiva carpeta de fotos en el Drive.*\n\n`;
  md += `| Municipio | Código Pozo (Firebase) |\n`;
  md += `|---|---|\n`;
  
  table2.sort((a, b) => a.municipio.localeCompare(b.municipio));
  table2.forEach(item => {
      md += `| ${item.municipio} | ${item.pozo} |\n`;
  });
  if (table2.length === 0) md += `| N/A | Todo Perfecto |\n`;

  const outputPath = 'C:\\Users\\ICA2025\\.gemini\\antigravity\\brain\\1759bf24-0d48-4961-81a0-ad723dc169a1\\reporte_discrepancias.md';
  fs.writeFileSync(outputPath, md, 'utf8');
  console.log('Reporte generado en: ' + outputPath);
}

generateTables().catch(console.error);
