import type { FotoRegistro } from '../types/catastro';
export type { FotoRegistro };

/**
 * Normaliza un texto: Mayúsculas y sin tildes/acentos.
 */
export const cleanText = (text: any): any => {
    if (typeof text !== 'string') return text;
    return text
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

/**
 * Elimina los binarios (base64) de un objeto antes de guardarlo en Firestore
 * para evitar el error de límite de 1MB por documento.
 */
export const stripBinaryData = (data: any): any => {
    if (!data) return data;
    try {
        const clean = JSON.parse(JSON.stringify(data));

        // 0. Normalizar campos de texto recursivamente
        const normalizeFields = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            Object.keys(obj).forEach(key => {
                const val = obj[key];
                const skipKeys = ['id', 'blobId', 'lastSync', 'downloadURL', 'url', 'uid', 'createdBy', 'creatorEmail', 'filename'];

                if (typeof val === 'string' && !skipKeys.includes(key)) {
                    if (val.length < 500 && !val.startsWith('data:image') && !val.startsWith('http')) {
                        obj[key] = cleanText(val);
                    }
                } else if (typeof val === 'object' && val !== null) {
                    normalizeFields(val);
                }
            });
        };

        normalizeFields(clean);

        if (clean.fotos && typeof clean.fotos === 'object') {
            Object.keys(clean.fotos).forEach(k => {
                if (clean.fotos[k] && typeof clean.fotos[k] === 'object') {
                    if (clean.fotos[k].blobId) {
                        delete clean.fotos[k].blobId;
                        clean.fotos[k].binaryStripped = true;
                    }
                }
            });
        }

        if (clean.fotoList && Array.isArray(clean.fotoList)) {
            clean.fotoList = clean.fotoList.map((f: any) => {
                if (f && typeof f === 'object') {
                    const { blobId, ...meta } = f;
                    return { ...meta, binaryStripped: !!blobId };
                }
                return f;
            });
        }

        return clean;
    } catch (e) {
        console.error("Error stripping binary data:", e);
        return data;
    }
};

/**
 * Función estricta que lee el nombre del archivo y retorna el JSON mapeado.
 */
export const procesarFoto = (filename: string, idPozo: string, base64String: string): FotoRegistro => {
    const cleanFilename = filename.toUpperCase().replace(/\s+/g, '');
    let tipo: FotoRegistro["tipo"] = "sumidero"; 
    let categoria: FotoRegistro["categoria"] = "OTRO";
    let subcategoria = "";
    let sumideroAsociado: string | undefined = undefined;

    const matchSum = cleanFilename.match(/-SUM(\d+)\.JPG$/);
    if (matchSum) {
        sumideroAsociado = `SUM${matchSum[1]}`;
    }

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

    if (cleanFilename.endsWith("-P.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "P";
        tipo = "general";
    } else if (/-T\.JPG$/.test(cleanFilename) && !/-(E|S|SUM)\d+-T\.JPG$/.test(cleanFilename)) {
        categoria = "PRINCIPAL";
        subcategoria = "T";
        tipo = "tapa";
    } else if (cleanFilename.endsWith("-I.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "I";
        tipo = "interior";
    } else if (cleanFilename.endsWith("-EV.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "EV";
        tipo = "esquema";
    } else if (cleanFilename.endsWith("-UG.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "UG";
        tipo = "ubicacion";
    } else if (cleanFilename.endsWith("-AT.JPG")) {
        categoria = "PRINCIPAL";
        subcategoria = "AT";
        tipo = "medicion";
    } else {
        const matchTub = cleanFilename.match(/-(E|S|SUM)(\d+)-(T|Z|B)/);
        if (matchTub) {
            const letter = matchTub[1];
            const num = matchTub[2];
            const vista = matchTub[3];

            if (letter === "E") {
                categoria = "ENTRADA";
                if (vista === "T") { subcategoria = `E${num}`; tipo = "tuberia_tapa"; }
                else if (vista === "Z") { subcategoria = `E${num}-Z`; tipo = "medicion"; }
                else if (vista === "D") { subcategoria = `E${num}-D`; tipo = "diametro"; }
                else if (vista === "P") { subcategoria = `E${num}-P`; tipo = "general"; }
            } else if (letter === "S") {
                categoria = "SALIDA";
                if (vista === "T") { subcategoria = `S${num}`; tipo = "tuberia_tapa"; }
                else if (vista === "Z") { subcategoria = `S${num}-Z`; tipo = "medicion"; }
                else if (vista === "D") { subcategoria = `S${num}-D`; tipo = "diametro"; }
                else if (vista === "P") { subcategoria = `S${num}-P`; tipo = "general"; }
            } else if (letter === "SUM") {
                categoria = "SUMIDERO";
                if (vista === "T") { subcategoria = `SUM${num}`; tipo = "sumidero_tapa"; }
                else if (vista === "Z") { subcategoria = `SUM${num}-Z`; tipo = "medicion"; }
                else if (vista === "D") { subcategoria = `SUM${num}-D`; tipo = "diametro"; }
                else if (vista === "B") { subcategoria = `SUM${num}-B`; tipo = "batea"; }
            }
        }
    }

    return {
        id: `foto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        idPozo: idPozo.toUpperCase(),
        pozoId: idPozo.toUpperCase(),
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
 * Redimensiona una imagen.
 */
export const resizeImage = (file: File | Blob, maxWidth = 1600, maxHeight = 1600, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
            else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }

            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { URL.revokeObjectURL(url); reject(new Error("No ctx")); return; }
            ctx.drawImage(img, 0, 0, width, height);
            const result = canvas.toDataURL('image/jpeg', quality);
            URL.revokeObjectURL(url);
            resolve(result);
        };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });
};

/**
 * Calcula el hash MD5 de un string (Base64 de la imagen).
 */
export const calculateMD5 = (str: string): string => {
    const k = [
        0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
        0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
        0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
        0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
        0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
        0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
        0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
        0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
    ];

    const rotateLeft = (lValue: number, iShiftBits: number) => (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));

    const addUnsigned = (lX: number, lY: number) => {
        const lX8 = (lX & 0x80000000); const lY8 = (lY & 0x80000000);
        const lX4 = (lX & 0x40000000); const lY4 = (lY & 0x40000000);
        const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        if (lX4 | lY4) {
            if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        } else return (lResult ^ lX8 ^ lY8);
    };

    const gF = (x: number, y: number, z: number) => (x & y) | ((~x) & z);
    const gG = (x: number, y: number, z: number) => (x & z) | (y & (~z));
    const gH = (x: number, y: number, z: number) => (x ^ y ^ z);
    const gI = (x: number, y: number, z: number) => (y ^ (x | (~z)));

    const md5Cycle = (x: any, c: any) => {
        let a = x[0], b = x[1], c1 = x[2], d = x[3];
        a = ff(a, b, c1, d, c[0], 7, k[0]); d = ff(d, a, b, c1, c[1], 12, k[1]); c1 = ff(c1, d, a, b, c[2], 17, k[2]); b = ff(b, c1, d, a, c[3], 22, k[3]);
        a = ff(a, b, c1, d, c[4], 7, k[4]); d = ff(d, a, b, c1, c[5], 12, k[5]); c1 = ff(c1, d, a, b, c[6], 17, k[6]); b = ff(b, c1, d, a, c[7], 22, k[7]);
        a = ff(a, b, c1, d, c[8], 7, k[8]); d = ff(d, a, b, c1, c[9], 12, k[9]); c1 = ff(c1, d, a, b, c[10], 17, k[10]); b = ff(b, c1, d, a, c[11], 22, k[11]);
        a = ff(a, b, c1, d, c[12], 7, k[12]); d = ff(d, a, b, c1, c[13], 12, k[13]); c1 = ff(c1, d, a, b, c[14], 17, k[14]); b = ff(b, c1, d, a, c[15], 22, k[15]);
        a = gg(a, b, c1, d, c[1], 5, k[16]); d = gg(d, a, b, c1, c[6], 9, k[17]); c1 = gg(c1, d, a, b, c[11], 14, k[18]); b = gg(b, c1, d, a, c[0], 20, k[19]);
        a = gg(a, b, c1, d, c[5], 5, k[20]); d = gg(d, a, b, c1, c[10], 9, k[21]); c1 = gg(c1, d, a, b, c[15], 14, k[22]); b = gg(b, c1, d, a, c[4], 20, k[23]);
        a = gg(a, b, c1, d, c[9], 5, k[24]); d = gg(d, a, b, c1, c[14], 9, k[25]); c1 = gg(c1, d, a, b, c[3], 14, k[26]); b = gg(b, c1, d, a, c[8], 20, k[27]);
        a = gg(a, b, c1, d, c[13], 5, k[28]); d = gg(d, a, b, c1, c[2], 9, k[29]); c1 = gg(c1, d, a, b, c[7], 14, k[30]); b = gg(b, c1, d, a, c[12], 20, k[31]);
        a = hh(a, b, c1, d, c[5], 4, k[32]); d = hh(d, a, b, c1, c[8], 11, k[33]); c1 = hh(c1, d, a, b, c[11], 16, k[34]); b = hh(b, c1, d, a, c[14], 23, k[35]);
        a = hh(a, b, c1, d, c[1], 4, k[36]); d = hh(d, a, b, c1, c[4], 11, k[37]); c1 = hh(c1, d, a, b, c[7], 16, k[38]); b = hh(b, c1, d, a, c[10], 23, k[39]);
        a = hh(a, b, c1, d, c[13], 4, k[40]); d = hh(d, a, b, c1, c[0], 11, k[41]); c1 = hh(c1, d, a, b, c[3], 16, k[42]); b = hh(b, c1, d, a, c[6], 23, k[43]);
        a = hh(a, b, c1, d, c[9], 4, k[44]); d = hh(d, a, b, c1, c[12], 11, k[45]); c1 = hh(c1, d, a, b, c[15], 16, k[46]); b = hh(b, c1, d, a, c[2], 23, k[47]);
        a = ii(a, b, c1, d, c[0], 6, k[48]); d = ii(d, a, b, c1, c[7], 10, k[49]); c1 = ii(c1, d, a, b, c[14], 15, k[50]); b = ii(b, c1, d, a, c[5], 21, k[51]);
        a = ii(a, b, c1, d, c[12], 6, k[52]); d = ii(d, a, b, c1, c[3], 10, k[53]); c1 = ii(c1, d, a, b, c[10], 15, k[54]); b = ii(b, c1, d, a, c[1], 21, k[55]);
        a = ii(a, b, c1, d, c[8], 6, k[56]); d = ii(d, a, b, c1, c[15], 10, k[57]); c1 = ii(c1, d, a, b, c[6], 15, k[58]); b = ii(b, c1, d, a, c[13], 21, k[59]);
        a = ii(a, b, c1, d, c[4], 6, k[60]); d = ii(d, a, b, c1, c[11], 10, k[61]); c1 = ii(c1, d, a, b, c[2], 15, k[62]); b = ii(b, c1, d, a, c[9], 21, k[63]);
        x[0] = addUnsigned(a, x[0]); x[1] = addUnsigned(b, x[1]); x[2] = addUnsigned(c1, x[2]); x[3] = addUnsigned(d, x[3]);
    };

    const ff = (a: any, b: any, c: any, d: any, x: any, s: any, ac: any) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, gF(b, c, d)), addUnsigned(x, ac)), s), b);
    const gg = (a: any, b: any, c: any, d: any, x: any, s: any, ac: any) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, gG(b, c, d)), addUnsigned(x, ac)), s), b);
    const hh = (a: any, b: any, c: any, d: any, x: any, s: any, ac: any) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, gH(b, c, d)), addUnsigned(x, ac)), s), b);
    const ii = (a: any, b: any, c: any, d: any, x: any, s: any, ac: any) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, gI(b, c, d)), addUnsigned(x, ac)), s), b);

    const convertToWords = (string: string) => {
        const lMessageLength = string.length;
        const lNumberOfWords_temp1 = lMessageLength + 8;
        const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        const lWordArray = Array(lNumberOfWords).fill(0);
        let lByteCount = 0;
        while (lByteCount < lMessageLength) {
            const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            const lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        const lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };

    const wordToHex = (lValue: number) => {
        let WordToHexValue = "";
        for (let lCount = 0; lCount <= 3; lCount++) {
            const lByte = (lValue >>> (lCount * 8)) & 255;
            const WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2);
        }
        return WordToHexValue;
    };

    const x = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    const words = convertToWords(str);
    for (let j = 0; j < words.length; j += 16) { md5Cycle(x, words.slice(j, j + 16)); }
    return wordToHex(x[0]) + wordToHex(x[1]) + wordToHex(x[2]) + wordToHex(x[3]);
};
