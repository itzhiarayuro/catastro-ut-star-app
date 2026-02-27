export interface FotoRegistro {
    id: string;
    idPozo: string;
    tipo: "general" | "tapa" | "interior" | "medicion" | "entrada" | "salida" | "sumidero";
    categoria: "PRINCIPAL" | "ENTRADA" | "SALIDA" | "SUMIDERO" | "OTRO";
    subcategoria: string;
    filename: string;
    sumideroAsociado?: string;
    esMedicion: boolean;
    esExcluido: boolean;
    motivoExclusion?: string;
    blobId: string;
}

/**
 * Función estricta que lee el nombre del archivo y retorna el JSON mapeado
 * basándose únicamente en las reglas enviadas.
 */
export const procesarFoto = (filename: string, idPozo: string, base64String: string): FotoRegistro => {
    // 1. Limpieza y preparación
    const cleanFilename = filename.toUpperCase().replace(/\s+/g, '');
    let tipo: FotoRegistro["tipo"] = "sumidero"; // Default genérico por TS
    let categoria: FotoRegistro["categoria"] = "OTRO";
    let subcategoria = "";
    let sumideroAsociado: string | undefined = undefined;

    // 2. Extracción de Sumidero (si aplica, ej: -SUM936.JPG)
    const matchSum = cleanFilename.match(/-SUM(\d+)\.JPG$/);
    if (matchSum) {
        sumideroAsociado = `SUM${matchSum[1]}`;
    }

    // 3. Regla Externa/Universal (AT y Z)
    let esMedicion = false;
    let esExcluido = false;
    let motivoExclusion: string | undefined = undefined;

    if (cleanFilename.includes("-AT.") || cleanFilename.includes("-AT-")) {
        esMedicion = true;
        esExcluido = true;
        motivoExclusion = "Contiene AT - Foto de medición con cinta";
    } else if (cleanFilename.includes("-Z.") || cleanFilename.includes("-Z-")) {
        esMedicion = true;
        esExcluido = true;
        motivoExclusion = "Contiene Z - Foto de profundidad";
    }

    // 4. Mapeo Lógico Principal

    // REGLAS 1: FOTOS DEL ELEMENTO PRINCIPAL
    if (cleanFilename.endsWith("-P.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "P";
        tipo = "general";
    }
    else if (/-T\.JPG$/.test(cleanFilename) && !/-(E|S)\d+-T\.JPG$/.test(cleanFilename)) {
        // Es una tapa principal si termina en -T.JPG y el bloque anterior no es un E1, S2, etc.
        categoria = "PRINCIPAL";
        subcategoria = "T";
        tipo = "tapa";
    }
    else if (cleanFilename.endsWith("-I.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "I";
        tipo = "interior";
    }
    else if (cleanFilename.endsWith("-AT.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "AT";
        tipo = "medicion"; // El motivo Excluido ya se asignó arriba
    }
    // REGLAS 2 Y 3: TUBERÍAS ENTRADA / SALIDA
    else {
        // Buscar el patrón fundamental -(E|S)#-(T|Z)
        const matchTub = cleanFilename.match(/-(E|S)(\d+)-(T|Z)/);
        if (matchTub) {
            const letter = matchTub[1];
            const num = matchTub[2];
            const vista = matchTub[3];

            if (letter === "E") {
                categoria = "ENTRADA";
                if (vista === "T") {
                    subcategoria = `E${num}`;
                    tipo = "entrada";
                } else if (vista === "Z") {
                    subcategoria = `E${num}-Z`;
                    tipo = "medicion";
                }
            } else if (letter === "S") {
                categoria = "SALIDA";
                if (vista === "T") {
                    subcategoria = `S${num}`;
                    tipo = "salida";
                } else if (vista === "Z") {
                    subcategoria = `S${num}-Z`;
                    tipo = "medicion";
                }
            }
        }
    }

    return {
        id: `foto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        idPozo: idPozo.toUpperCase(),
        tipo,
        categoria,
        subcategoria,
        filename: cleanFilename,
        ...(sumideroAsociado && { sumideroAsociado }),
        esMedicion,
        esExcluido,
        ...(motivoExclusion && { motivoExclusion }),
        blobId: base64String
    };
};

/**
 * Redimensiona una imagen para evitar errores de memoria en dispositivos móviles.
 * Utiliza URL.createObjectURL para ser más eficiente que base64.
 * Limita el ancho/alto máximo a 1600px (Sugerido para ingeniería).
 */
export const resizeImage = (file: File | Blob, maxWidth = 1600, maxHeight = 1600, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error("No se pudo obtener el contexto del canvas"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // toDataURL sigue siendo necesario porque Firestore guarda base64,
            // pero lo llamamos después del redimensionado, por lo que el string es 10x más pequeño.
            const result = canvas.toDataURL('image/jpeg', quality);

            // Liberar memoria inmediatamente
            URL.revokeObjectURL(url);
            resolve(result);
        };

        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };

        img.src = url;
    });
};
