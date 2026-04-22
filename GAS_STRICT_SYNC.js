const FOLDER_ROOT_ID = '1JJFOP_OQot-n4sqfDORtJYuLQiNyoDZx'; 
const SECRET_TOKEN = 'STAR-2025-VIP-SYNC'; 

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    
    // 1. Validar el Token Secreto
    if (postData.token !== SECRET_TOKEN) {
      return errorResponse('Acceso Denegado (Token Invalido)');
    }

    // --- ACCIÓN: DOWNLOAD ---
    if (postData.action === 'download') {
      const filename = postData.filename;
      const municipio = postData.municipio;
      const pozoId = postData.pozoId;
      if (!filename) return errorResponse('Filename es obligatorio para download');

      // ESTRATEGIA DE BÚSQUEDA EN 4 NIVELES:
      // 0. Búsqueda exacta dentro de la carpeta del municipio
      // 1. Búsqueda global exacta (DriveApp.getFilesByName busca en TODO el Drive)
      // 2. Búsqueda global con variantes de extensión (JPG↔jpg↔JPEG↔jpeg↔PNG↔png)
      // 3. Búsqueda recursiva dentro de la carpeta raíz del proyecto

      let file = null;

      // --- NIVEL 0: Búsqueda exacta en la ruta completa del pozo ---
      if (municipio && pozoId) {
        try {
          const rootFolder = DriveApp.getFolderById(FOLDER_ROOT_ID);
          const munFolders = rootFolder.getFoldersByName(municipio.toUpperCase());
          if (munFolders.hasNext()) {
             const munFolder = munFolders.next();
             
             // Buscar directo en CATASTRO o MARCACION
             const categorias = postData.categoria ? [postData.categoria.toUpperCase()] : ['CATASTRO', 'MARCACION'];
             for (let i = 0; i < categorias.length; i++) {
               const catFolders = munFolder.getFoldersByName(categorias[i]);
               if (catFolders.hasNext()) {
                 const catFolder = catFolders.next();
                 const pozoFolders = catFolder.getFoldersByName(pozoId.toUpperCase());
                 if (pozoFolders.hasNext()) {
                   const pozoFolder = pozoFolders.next();
                   
                   // Búsqueda exacta en esta carpeta
                   const exactFiles = pozoFolder.getFilesByName(filename);
                   if (exactFiles.hasNext()) {
                     const exactFile = exactFiles.next();
                     if (!exactFile.isTrashed()) {
                       file = exactFile;
                       break;
                     }
                   }
                   
                   // Búsqueda con variantes en esta capeta
                   const variants = getFilenameVariants(filename);
                   for (const variant of variants) {
                     const vFiles = pozoFolder.getFilesByName(variant);
                     if (vFiles.hasNext()) {
                       const vFile = vFiles.next();
                       if (!vFile.isTrashed()) {
                         file = vFile;
                         break;
                       }
                     }
                   }
                 }
               }
               if (file) break;
             }
             
             // Fallback a recursivo en el municipio completo solo si falló la ruta exacta
             if (!file) {
                file = findFileRecursive(munFolder, filename, 0);
             }
          }
        } catch (e) {
          console.warn(`[ERROR NIVEL 0] Excepción durante búsqueda exacta para ${filename}: ${e.toString()}`);
        }
      }

      // --- NIVEL 1: Búsqueda global con nombre exacto ---
      if (!file) {
        console.warn(`[FALLBACK GLOBAL] Nivel 0 falló para ${filename}. Buscando en todo Drive.`);
        file = findFileGlobal(filename);
      }

      // --- NIVEL 2: Búsqueda global con variantes de extensión ---
      if (!file) {
        const variants = getFilenameVariants(filename);
        for (const variant of variants) {
          file = findFileGlobal(variant);
          if (file) break;
        }
      }

      // --- NIVEL 3: Búsqueda recursiva en la carpeta raíz del proyecto ---
      if (!file) {
        try {
          const rootFolder = DriveApp.getFolderById(FOLDER_ROOT_ID);
          file = findFileRecursive(rootFolder, filename);
        } catch (e) {
          // Si la carpeta raíz no existe o hay error, ignoramos
        }
      }

      if (file) {
        const blob = file.getBlob();
        const base64 = Utilities.base64Encode(blob.getBytes());
        return jsonResponse({
          success: true,
          base64: "data:" + blob.getContentType() + ";base64," + base64,
          mimeType: blob.getContentType(),
          fileId: file.getId(),
          fileName: file.getName()
        });
      }

      return errorResponse('Archivo no encontrado en Drive: ' + filename);
    }

    // --- ACCIÓN: LIST (Listar archivos de un pozo en Drive) ---
    if (postData.action === 'list') {
      const municipio = postData.municipio;
      const pozoId = postData.pozoId;
      const categoria = postData.categoria; // 'CATASTRO' | 'MARCACION' | undefined (prueba ambas)
      if (!municipio || !pozoId) return errorResponse('municipio y pozoId son obligatorios para list');

      try {
        const rootFolder = DriveApp.getFolderById(FOLDER_ROOT_ID);
        const munFolders = rootFolder.getFoldersByName(municipio.toUpperCase());
        if (!munFolders.hasNext()) return jsonResponse({ success: true, files: [] });

        const munFolder = munFolders.next();
        const categorias = categoria ? [categoria.toUpperCase()] : ['CATASTRO', 'MARCACION'];
        const files = [];

        for (const cat of categorias) {
          const catFolders = munFolder.getFoldersByName(cat);
          if (!catFolders.hasNext()) continue;
          const catFolder = catFolders.next();
          const pozoFolders = catFolder.getFoldersByName(pozoId.toUpperCase());
          if (!pozoFolders.hasNext()) continue;
          const pozoFolder = pozoFolders.next();

          const iter = pozoFolder.getFiles();
          while (iter.hasNext()) {
            const f = iter.next();
            if (!f.isTrashed()) {
              files.push({ filename: f.getName(), fileId: f.getId(), mimeType: f.getMimeType() });
            }
          }
          break; // encontró la carpeta, no sigue buscando
        }

        return jsonResponse({ success: true, files: files });
      } catch (e) {
        return errorResponse('Error listando carpeta: ' + e.toString());
      }
    }

    // --- ACCIÓN: UPLOAD ZIP (Legacy Apps) ---
    if (postData.zipData && postData.metadata) {
      const zipBase64 = postData.zipData;
      const metadataList = postData.metadata;
      
      const zipBlob = Utilities.newBlob(Utilities.base64Decode(zipBase64), 'application/zip', 'upload.zip');
      const unzippedFiles = Utilities.unzip(zipBlob);
      const rootFolder = DriveApp.getFolderById(FOLDER_ROOT_ID);
      
      unzippedFiles.forEach(file => {
        const filename = file.getName();
        const metadata = metadataList.find(m => m.filename === filename);
        
        if (metadata) {
          const categoria = (metadata.barrio && metadata.barrio.toUpperCase().includes('MARCACION')) ? 'MARCACION' : 'CATASTRO';
          const munFolder = getOrCreateFolder(rootFolder, metadata.municipio.toUpperCase());
          const catFolder = getOrCreateFolder(munFolder, categoria);
          const pozoFolder = getOrCreateFolder(catFolder, metadata.pozoId.toUpperCase());
          const existingIter = pozoFolder.getFilesByName(filename);
          let isDuplicate = false;
          while (existingIter.hasNext()) {
            if (existingIter.next().getSize() === file.getBytes().length) {
              isDuplicate = true;
              break;
            }
          }
          if (!isDuplicate) pozoFolder.createFile(file);
        } else {
          const existingRootIter = rootFolder.getFilesByName(filename);
          let isRootDuplicate = false;
          while (existingRootIter.hasNext()) {
            if (existingRootIter.next().getSize() === file.getBytes().length) {
              isRootDuplicate = true;
              break;
            }
          }
          if (!isRootDuplicate) rootFolder.createFile(file);
        }
      });

      return jsonResponse({ success: true, message: 'ZIP procesado correctamente' });
    }

    // --- ACCIÓN: UPLOAD (Single File - Default) ---
    return processUpload(postData);

  } catch (error) {
    return errorResponse('Error Crítico: ' + error.toString());
  }
}

/**
 * Procesa la subida de un archivo con chequeo MD5 y jerarquía de carpetas.
 */
function processUpload(data) {
  const { municipio, barrio, pozoId, filename, base64, md5 } = data;

  // 1. Validación de Datos Obligatorios
  if (!pozoId || pozoId === "SIN_ID" || pozoId.trim() === "") {
    return errorResponse("RECHAZADO: pozoId es invalido o esta vacio.");
  }
  if (!municipio) return errorResponse("Municipio es obligatorio.");
  if (!base64) return errorResponse("Contenido Base64 es obligatorio.");

  // Determinar Categoría (CATASTRO o MARCACION)
  // barrioFlag ahora viene explícito como 'CATASTRO' o 'MARCACION'
  const categoria = (barrio && barrio.toUpperCase().includes('MARCACION')) ? 'MARCACION' : 'CATASTRO';

  const rootFolder = DriveApp.getFolderById(FOLDER_ROOT_ID);
  
  // Jerarquía: MUNICIPIO / CATEGORÍA / POZO_ID
  const munFolder = getOrCreateFolder(rootFolder, municipio.toUpperCase());
  const catFolder = getOrCreateFolder(munFolder, categoria);
  const pozoFolder = getOrCreateFolder(catFolder, pozoId.toUpperCase());

  // 2. Detección de Duplicados Extrema (MD5)
  // Si el cliente envió el MD5, buscamos por nombre y comparamos el MD5 guardado en la descripción.
  const existingFiles = pozoFolder.getFilesByName(filename);
  while (existingFiles.hasNext()) {
    const existingFile = existingFiles.next();
    
    // CASO A: Tenemos MD5 en la petición
    if (md5) {
      const existingDesc = existingFile.getDescription() || "";
      // Verificamos si el MD5 coincide con el guardado en la descripción
      if (existingDesc.includes("MD5: " + md5)) {
        return jsonResponse({ 
          success: true, 
          message: 'Archivo omitido (MD5 Identico)', 
          fileId: existingFile.getId(), 
          isDuplicate: true 
        });
      }
      // Si el nombre coincide pero el MD5 es diferente, el loop continúa.
      // Si no hay más archivos con ese nombre, el script creará uno nuevo (Drive permite nombres duplicados).
    } else {
      // CASO B: Fallback por tamaño (Compatibilidad con versiones antiguas de la App sin MD5)
      const blobTemp = Utilities.newBlob(Utilities.base64Decode(extractBase64(base64)));
      if (existingFile.getSize() === blobTemp.getBytes().length) {
        return jsonResponse({ 
          success: true, 
          message: 'Archivo omitido (Tamaño Identico)', 
          fileId: existingFile.getId(), 
          isDuplicate: true 
        });
      }
    }
  }

  // 3. Crear el Archivo
  const contentType = base64.split(',')[0].split(':')[1].split(';')[0];
  const blob = Utilities.newBlob(Utilities.base64Decode(extractBase64(base64)), contentType, filename);
  const file = pozoFolder.createFile(blob);
  
  // Agregar descripción con el MD5 para futuros chequeos si se desea
  if (md5) file.setDescription("MD5: " + md5);

  return jsonResponse({
    success: true,
    fileId: file.getId(),
    url: file.getUrl()
  });
}

/**
 * Obtiene o crea una carpeta. Lanza error si hay conflictos (múltiples carpetas con mismo nombre).
 */
function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    const folder = folders.next();
    if (folders.hasNext()) {
      throw new Error("CONFLICTO: Se encontraron multiples carpetas llamadas '" + name + "' en " + parent.getName() + ". Por favor unifica las carpetas manualmente en Drive.");
    }
    return folder;
  }
  return parent.createFolder(name);
}

function extractBase64(data) {
  return data.indexOf(',') > -1 ? data.split(',')[1] : data;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return jsonResponse({ success: false, error: msg });
}

// ============================================
// FUNCIONES DE BÚSQUEDA ROBUSTA PARA DOWNLOAD
// ============================================

/**
 * Busca un archivo por nombre EXACTO en todo el Drive.
 * Ignora archivos en la papelera.
 * @param {string} filename - Nombre exacto del archivo (ej: "PZ2-P.JPG")
 * @returns {GoogleAppsScript.Drive.File|null}
 */
function findFileGlobal(filename) {
  const files = DriveApp.getFilesByName(filename);
  while (files.hasNext()) {
    const file = files.next();
    // Saltar archivos en la papelera
    if (file.isTrashed()) continue;
    return file;
  }
  return null;
}

/**
 * Genera variantes del nombre de archivo con diferentes extensiones.
 * Ejemplo: "PZ2-P.JPG" → ["PZ2-P.jpg", "PZ2-P.jpeg", "PZ2-P.JPEG", "PZ2-P.png", "PZ2-P.PNG"]
 * @param {string} filename
 * @returns {string[]}
 */
function getFilenameVariants(filename) {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return [];

  const nameWithoutExt = filename.substring(0, dotIndex);
  const ext = filename.substring(dotIndex + 1);
  const extLower = ext.toLowerCase();
  const extUpper = ext.toUpperCase();

  // Mapeo de extensiones equivalentes
  const extensionGroups = {
    'jpg': ['jpg', 'JPG', 'jpeg', 'JPEG'],
    'jpeg': ['jpeg', 'JPEG', 'jpg', 'JPG'],
    'png': ['png', 'PNG'],
    'gif': ['gif', 'GIF'],
    'webp': ['webp', 'WEBP'],
  };

  const group = extensionGroups[extLower] || [extLower, extUpper];
  const variants = [];

  for (const variantExt of group) {
    const variant = nameWithoutExt + '.' + variantExt;
    if (variant !== filename) {
      variants.push(variant);
    }
  }

  return variants;
}

/**
 * Busca un archivo recursivamente dentro de una carpeta y sus subcarpetas.
 * Compara nombres de forma case-insensitive.
 * Profundidad máxima: 5 niveles para evitar timeouts.
 * @param {GoogleAppsScript.Drive.Folder} folder
 * @param {string} filename
 * @param {number} depth - Profundidad actual (default 0)
 * @returns {GoogleAppsScript.Drive.File|null}
 */
function findFileRecursive(folder, filename, depth = 0) {
  if (depth > 5) return null; // Protección contra timeouts

  const targetUpper = filename.toUpperCase();
  const variants = getFilenameVariants(filename).map(v => v.toUpperCase());

  // Buscar archivos en esta carpeta UNA ÚNICA VEZ
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed()) continue;
    
    const fNameUpper = file.getName().toUpperCase();
    if (fNameUpper === targetUpper || variants.indexOf(fNameUpper) !== -1) {
      return file;
    }
  }

  // Buscar en subcarpetas
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    const found = findFileRecursive(subfolder, filename, depth + 1);
    if (found) return found;
  }

  return null;
}
