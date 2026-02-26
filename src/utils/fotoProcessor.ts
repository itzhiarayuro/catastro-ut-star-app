export interface FotoRegistro {
    id: string;
    idPozo: string;
    tipo: "general" | "tapa" | "interior" | "medicion" | "entrada" | "salida" | "sumidero";
    categoria: "PRINCIPAL" | "ENTRADA" | "SALIDA" | "SUMIDERO" | "OTRO";
    subcategoria: string;
    blobId: string;
    filename: string;
    descripcion?: string;
    esMedicion: boolean;
    esExcluido: boolean;
    motivoExclusion?: "AT medición" | "Z profundidad";
    sumideroAsociado?: string;
}

export const generateFilename = (pozo: string, subcat: string, sumidero?: string): string => {
    let parts = [pozo, subcat];
    if (sumidero) parts.push(sumidero);
    return `${parts.join('-').toUpperCase()}.JPG`;
};

export const procesarFoto = (
    pozo: string,
    tipo: FotoRegistro["tipo"] | string,
    index: string,
    sumidero?: string,
    extra?: "T" | "Z" | "AT" | string
): Partial<FotoRegistro> => {
    let subcat = "";
    let categoria: FotoRegistro["categoria"] = "OTRO";

    const pozoClean = pozo.replace(/\s+/g, '').toUpperCase();
    const sumClean = sumidero?.replace(/\s+/g, '').toUpperCase();

    switch (tipo) {
        case "general":
            subcat = "P";
            categoria = "PRINCIPAL";
            break;
        case "tapa":
            subcat = "T";
            categoria = "PRINCIPAL";
            break;
        case "interior":
            subcat = "I";
            categoria = "PRINCIPAL";
            break;
        case "entrada":
            subcat = `E${index}${extra ? `-${extra}` : '-T'}`; // Default to T if none
            categoria = "ENTRADA";
            break;
        case "salida":
            subcat = `S${index}${extra ? `-${extra}` : '-T'}`;
            categoria = "SALIDA";
            break;
        case "sumidero":
            subcat = `SUM${index}`;
            categoria = "SUMIDERO";
            break;
        case "medicion":
            subcat = extra || index;
            categoria = "OTRO";
            break;
        default:
            subcat = tipo.toUpperCase();
    }

    const filename = generateFilename(pozoClean, subcat, sumClean);
    const esMedicion = filename.includes("-AT") || filename.includes("-Z") || filename.includes("-AT-") || filename.includes("-Z-");
    const esExcluido = esMedicion;

    return {
        idPozo: pozoClean,
        tipo: tipo as any,
        categoria,
        subcategoria: subcat,
        filename,
        esMedicion,
        esExcluido,
        motivoExclusion: filename.includes("-AT") ? "AT medición" : (filename.includes("-Z") ? "Z profundidad" : undefined),
        sumideroAsociado: sumClean
    };
};
