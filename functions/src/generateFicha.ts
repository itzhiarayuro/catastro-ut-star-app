import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// jsPDF se importa como CommonJS para funcionar en Node.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { jsPDF } = require("jspdf");
import imageSize from "image-size";

const db = () => admin.firestore();
const storage = () => admin.storage();

// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface FichaData {
    pozo?: string;
    municipio?: string;
    barrio?: string;
    fecha?: string;
    elaboro?: string;
    estadoPozo?: string;
    gps?: { lat?: number; lng?: number; x?: number; y?: number };
    direccion?: string;
    altura?: number | string;
    rasante?: string;
    diam?: string | number;
    sistema?: string;
    tapa?: { existe?: string; material?: string; estado?: string };
    cono?: { existe?: string; tipo?: string; material?: string; estado?: string };
    cargue?: { existe?: string; material?: string; estado?: string };
    canu?: { existe?: string; material?: string; estado?: string };
    peld?: { existe?: string; material?: string; numero?: string; estado?: string };
    pipes?: PipeData[];
    sums?: SumData[];
    fotoList?: FotoData[];
    obs?: string;
    [key: string]: unknown;
}

interface PipeData {
    id?: string;
    es?: string;
    diam?: string | number;
    mat?: string;
    cotaZ?: string | number;
    orden?: number;
    estado?: string;
}

interface SumData {
    id?: string;
    tipo?: string;
    esquema?: string;
    diam?: string | number;
    material?: string;
    hSalida?: string | number;
    hLlegada?: string | number;
}

interface FotoData {
    id?: string;
    nombre?: string;
    filename?: string;
    blobId?: string;
    tipo?: string;
    fecha?: number;
}

interface Placement {
    id: string;
    fieldId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    groupId?: string; // IMPORTANTE: Para grupos condicionales
    pageNumber?: number;
    repeatOnEveryPage?: boolean;
    isVisible?: boolean;
    showLabel?: boolean;
    customLabel?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    textAlign?: string;
    labelFontSize?: number;
    labelColor?: string;
    labelBackgroundColor?: string;
    labelFontWeight?: string;
    labelTextAlign?: string;
    labelPadding?: number;
    labelAlign?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    opacity?: number;
}

interface ShapeElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    groupId?: string; // IMPORTANTE: Para grupos condicionales
    pageNumber?: number;
    repeatOnEveryPage?: boolean;
    isVisible?: boolean;
    fillColor?: string;
    strokeColor?: string;
    content?: string;
    fontSize?: number;
    color?: string;
    opacity?: number;
}

interface Group {
    id: string;
    name: string;
    description?: string;
}

interface TechnicalGroup {
    type: 'entrada' | 'salida' | 'sumidero';
    number: number;
    elements: (Placement | ShapeElement & { _isShape: boolean })[];
    hasRealData: boolean;
}

interface Design {
    pageSize: string;
    orientation: string;
    unit?: string;
    numPages?: number;
    placements: Placement[];
    shapes?: ShapeElement[];
    groups?: Group[]; // Lista de grupos definida en el JSON
}

// ─────────────────────────────────────────────────
// MAPEO: Firestore → Pozo normalizado
// ─────────────────────────────────────────────────
function mapFirestoreToPozo(data: FichaData) {
    const fv = (v: unknown) => String(v ?? "-");

    return {
        identificacion: {
            idPozo: fv(data.pozo),
            fecha: fv(data.fecha),
            levanto: fv(data.elaboro),
            estado: fv(data.estadoPozo),
            coordenadaX: fv(data.gps?.x),
            coordenadaY: fv(data.gps?.y),
            latitud: fv(data.gps?.lat),
            longitud: fv(data.gps?.lng),
        },
        ubicacion: {
            direccion: fv(data.direccion),
            barrio: fv(data.barrio),
            municipio: fv(data.municipio),
            profundidad: fv(data.altura),
        },
        componentes: {
            estructuraPavimento: fv(data.rasante),
            diametroCilindro: fv(data.diam),
            sistema: fv(data.sistema),
            existeTapa: fv(data.tapa?.existe),
            materialTapa: fv(data.tapa?.material),
            estadoTapa: fv(data.tapa?.estado),
            existeCono: fv(data.cono?.existe),
            tipoCono: fv(data.cono?.tipo),
            materialCono: fv(data.cono?.material),
            estadoCono: fv(data.cono?.estado),
            existeCilindro: fv(data.cargue?.existe),
            materialCilindro: fv(data.cargue?.material),
            estadoCilindro: fv(data.cargue?.estado),
            existeCanuela: fv(data.canu?.existe),
            materialCanuela: fv(data.canu?.material),
            estadoCanuela: fv(data.canu?.estado),
            existePeldanos: fv(data.peld?.existe),
            materialPeldanos: fv(data.peld?.material),
            numeroPeldanos: fv(data.peld?.numero),
            estadoPeldanos: fv(data.peld?.estado),
            tipoCamara: fv((data as any).tipoCamara),
        },
        observaciones: { observaciones: fv(data.obs) },
        pipes: (data.pipes ?? []).map((p, i) => ({
            id: fv(p.id ?? `T${i + 1}`),
            tipo: (p.es ?? "").toLowerCase(),       // ENTRADA→entrada / SALIDA→salida
            diam: fv(p.diam),
            mat: fv(p.mat),
            cota: fv(p.cotaZ),
            orden: p.orden ?? i + 1,
            estado: fv(p.estado),
        })),
        fotos: (data.fotoList ?? []).map((f, i) => ({
            id: f.id ?? `foto-${i}`,
            nombre: f.nombre ?? f.filename ?? `foto-${i}.jpg`,
            blobId: f.blobId ?? "",
        })),
        sums: (data.sums ?? []).map((s, i) => ({
            id: fv(s.id ?? `S${i + 1}`),
            tipo: fv(s.tipo),
            diam: fv(s.diam),
            mat: fv(s.material),
            hSalida: fv(s.hSalida),
            hLlegada: fv(s.hLlegada),
        })),
    };
}

// ─────────────────────────────────────────────────
// MAPEO: fieldId → valor en el objeto pozo
// ─────────────────────────────────────────────────
function getFieldValue(pozo: ReturnType<typeof mapFirestoreToPozo>, fieldId: string): string | null {
    const MAP: Record<string, string> = {
        pozo_id: pozo.identificacion.idPozo,
        pozo_fecha: pozo.identificacion.fecha,
        pozo_levanto: pozo.identificacion.levanto,
        pozo_estado: pozo.identificacion.estado,
        pozo_coordX: pozo.identificacion.coordenadaX,
        pozo_coordY: pozo.identificacion.coordenadaY,
        pozo_latitud: pozo.identificacion.latitud,
        pozo_longitud: pozo.identificacion.longitud,
        pozo_barrio: pozo.ubicacion.barrio,
        pozo_municipio: pozo.ubicacion.municipio,
        pozo_profundidad: pozo.ubicacion.profundidad,
        pozo_direccion: pozo.ubicacion.direccion,
        pozo_tipoCamara: pozo.componentes.tipoCamara,
        pozo_estructuraPavimento: pozo.componentes.estructuraPavimento,
        pozo_existeTapa: pozo.componentes.existeTapa,
        pozo_materialTapa: pozo.componentes.materialTapa,
        pozo_estadoTapa: pozo.componentes.estadoTapa,
        pozo_existeCono: pozo.componentes.existeCono,
        pozo_tipoCono: pozo.componentes.tipoCono,
        pozo_materialCono: pozo.componentes.materialCono,
        pozo_estadoCono: pozo.componentes.estadoCono,
        pozo_existeCilindro: pozo.componentes.existeCilindro,
        pozo_diametroCilindro: pozo.componentes.diametroCilindro,
        pozo_materialCilindro: pozo.componentes.materialCilindro,
        pozo_estadoCilindro: pozo.componentes.estadoCilindro,
        pozo_existeCanuela: pozo.componentes.existeCanuela,
        pozo_materialCanuela: pozo.componentes.materialCanuela,
        pozo_estadoCanuela: pozo.componentes.estadoCanuela,
        pozo_existePeldanos: pozo.componentes.existePeldanos,
        pozo_materialPeldanos: pozo.componentes.materialPeldanos,
        pozo_numPeldanos: pozo.componentes.numeroPeldanos,
        pozo_estadoPeldanos: pozo.componentes.estadoPeldanos,
        pozo_sistema: pozo.componentes.sistema,
        pozo_observaciones: pozo.observaciones.observaciones,
    };

    if (fieldId in MAP) return MAP[fieldId];

    // Tuberías dinámicas: ent_diam_1, sal_mat_2, etc.
    const pipeMatch = fieldId.match(/^(ent|sal)_([a-z]+)_(\d+)$/);
    if (pipeMatch) {
        const tipoTarget = pipeMatch[1] === "ent" ? "entrada" : "salida";
        const prop = pipeMatch[2] as "diam" | "mat" | "cota" | "estado";
        const idx = parseInt(pipeMatch[3]) - 1;
        const pipes = pozo.pipes.filter(p => p.tipo.toLowerCase().startsWith(tipoTarget));
        const pipe = pipes[idx];
        if (pipe) return pipe[prop] ?? "-";
    }

    // Fotos: foto_panoramica, foto_tapa, foto_interior, foto_shape, foto_entrada_1, foto_salida_2
    const FOTO_CODE_MAP: Record<string, string> = {
        foto_panoramica: "P",
        foto_tapa: "T",
        foto_interior: "I",
        foto_shape: "L",
        foto_entrada_1: "E1", foto_entrada_2: "E2", foto_entrada_3: "E3", foto_entrada_4: "E4",
        foto_salida_1: "S1", foto_salida_2: "S2", foto_salida_3: "S3",
        foto_sumidero_1: "SUM1", foto_sumidero_2: "SUM2", foto_sumidero_3: "SUM3",
    };

    if (fieldId in FOTO_CODE_MAP) {
        const code = FOTO_CODE_MAP[fieldId];
        const foto = pozo.fotos.find(f => {
            const n = (f.nombre ?? "").toUpperCase();
            // Buscar por código al final del nombre antes de la extensión: P076-P.jpg, P076-E1.jpg
            const match = n.match(/-([A-Z0-9]+)\.[A-Z]+$/);
            return match ? match[1] === code : false;
        });
        return foto?.blobId ?? null;
    }

    return "-";
}

// ─────────────────────────────────────────────────
// MOTOR DE LAYOUT INTELIGENTE (Página 2)
// ─────────────────────────────────────────────────

function checkIfPage2ShouldBeSkipped(pozo: ReturnType<typeof mapFirestoreToPozo>): boolean {
    const hasPipes = pozo.pipes.length > 0;
    const hasSums = pozo.sums.length > 0;

    const page2PhotoCodes = [
        'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8',
        'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
        'SUM1', 'SUM2', 'SUM3', 'SUM4', 'SUM5', 'SUM6', 'SUM7', 'SUM8'
    ];

    const hasPage2Photos = pozo.fotos.some(f => {
        const n = (f.nombre || "").toUpperCase();
        const match = n.match(/-([A-Z0-9]+)\.[A-Z]+$/);
        return match ? page2PhotoCodes.includes(match[1]) : false;
    });

    return !hasPipes && !hasSums && !hasPage2Photos;
}

function applySmartLayout(elements: any[], design: Design, pozo: ReturnType<typeof mapFirestoreToPozo>): any[] {
    const page1Elements = elements.filter(el => (el.pageNumber || 1) === 1 || el.repeatOnEveryPage);
    const page2Elements = elements.filter(el => (el.pageNumber || 1) === 2 && !el.repeatOnEveryPage);
    const otherPageElements = elements.filter(el => (el.pageNumber || 1) > 2);

    // Clasificar elementos de Página 2
    const technicalFields = page2Elements.filter(el => {
        if (el._isShape) return false;
        const fid = (el as Placement).fieldId;
        return fid.startsWith("ent_") || fid.startsWith("sal_") || fid.startsWith("sum_") || fid.startsWith("foto_");
    });
    const decorativeElements = page2Elements.filter(el => !technicalFields.includes(el));

    // Agrupar técnicos
    const groups = buildTechnicalGroups(technicalFields, pozo);

    // Reposicionar en 3 columnas
    const startY = 54; // Estimado, podrías hacerlo dinámico
    const entries = groups.filter(g => g.type === 'entrada' && g.hasRealData);
    const exits = groups.filter(g => g.type === 'salida' && g.hasRealData);
    const sums = groups.filter(g => g.type === 'sumidero' && g.hasRealData);

    const repoEntries = repositionGroupsInColumn(entries, 10, startY, 2);
    const repoExits = repositionGroupsInColumn(exits, 74.67, startY, 2);
    const repoSums = repositionGroupsInColumn(sums, 139.34, startY, 2);

    return [
        ...page1Elements,
        ...decorativeElements,
        ...repoEntries,
        ...repoExits,
        ...repoSums,
        ...otherPageElements
    ];
}

function buildTechnicalGroups(elements: any[], pozo: ReturnType<typeof mapFirestoreToPozo>): TechnicalGroup[] {
    const groupsMap: Record<string, TechnicalGroup> = {};

    elements.forEach(el => {
        const fid = el.fieldId as string;
        let type: 'entrada' | 'salida' | 'sumidero' | null = null;
        let num = 0;

        const pipeMatch = fid.match(/^(ent|sal)_[a-z]+_(\d+)$/);
        const fotoMatch = fid.match(/^foto_(entrada|salida|sumidero)_(\d+)$/);

        if (pipeMatch) {
            type = pipeMatch[1] === "ent" ? "entrada" : "salida";
            num = parseInt(pipeMatch[2]);
        } else if (fotoMatch) {
            type = fotoMatch[1] === "entrada" ? "entrada" : fotoMatch[1] === "salida" ? "salida" : "sumidero";
            num = parseInt(fotoMatch[2]);
        }

        if (type && num) {
            const key = `${type}_${num}`;
            if (!groupsMap[key]) {
                groupsMap[key] = { type, number: num, elements: [], hasRealData: false };
            }
            groupsMap[key].elements.push(el);
        }
    });

    const groups = Object.values(groupsMap);
    groups.forEach(g => {
        g.hasRealData = checkHasRealData(g, pozo);
    });

    return groups;
}

function checkHasRealData(group: TechnicalGroup, pozo: ReturnType<typeof mapFirestoreToPozo>): boolean {
    const idx = group.number - 1;
    if (group.type === 'entrada') return !!pozo.pipes.filter(p => p.tipo === 'entrada')[idx];
    if (group.type === 'salida') return !!pozo.pipes.filter(p => p.tipo === 'salida')[idx];
    if (group.type === 'sumidero') return !!pozo.sums[idx];
    return false;
}

function repositionGroupsInColumn(groups: TechnicalGroup[], colX: number, startY: number, pageNumber: number): any[] {
    let currentY = startY;
    const result: any[] = [];
    const GROUP_GAP = 4;

    groups.sort((a, b) => a.number - b.number);

    groups.forEach(g => {
        // Encontrar el elemento más a la izquierda del grupo original para calcular offsets relativos si fuera necesario
        // Pero aquí simplificamos: alineamos todo a colX y apilamos.

        // Calculamos offsets relativos de cada elemento dentro del grupo original
        // para preservar su layout interno (label arriba, foto abajo, etc)
        const minY = Math.min(...g.elements.map(el => el.y));

        g.elements.forEach(el => {
            const relY = el.y - minY;
            const relX = el.x - Math.min(...g.elements.map(e => e.x));

            el.x = colX + relX;
            el.y = currentY + relY;
            el.pageNumber = pageNumber;
            result.push(el);
        });

        const gHeight = Math.max(...g.elements.map(el => el.y + el.height)) - currentY;
        currentY += gHeight + GROUP_GAP;
    });

    return result;
}

// ─────────────────────────────────────────────────
// RENDER PDF
// ─────────────────────────────────────────────────
async function generatePdf(design: Design, pozo: ReturnType<typeof mapFirestoreToPozo>): Promise<Buffer> {
    const orientation = design.orientation === "landscape" ? "l" : "p";
    const format = (design.pageSize ?? "Letter").toLowerCase();

    const doc = new jsPDF({ orientation, unit: "mm", format });

    let allElements = [
        ...(design.shapes ?? []).map((s: ShapeElement) => ({ ...s, _isShape: true })),
        ...(design.placements ?? []).map((p: Placement) => ({ ...p, _isShape: false })),
    ];

    // Aplicar Smart Layout
    const skipP2 = checkIfPage2ShouldBeSkipped(pozo);
    allElements = applySmartLayout(allElements, design, pozo);

    allElements.sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

    const numPages = skipP2 ? 1 : (design.numPages || 1);

    for (let pageIdx = 1; pageIdx <= numPages; pageIdx++) {
        if (pageIdx > 1) doc.addPage();

        for (const el of allElements) {
            if (el.isVisible === false) continue;

            const isRepeated = (el as any).repeatOnEveryPage;
            const elPage = (el as any).pageNumber || 1;
            if (!isRepeated && elPage !== pageIdx) continue;

            const opacity = (el as any).opacity ?? 1;
            try { doc.setGState(new (doc as any).GState({ opacity })); } catch (_) { /* ignorar */ }

            if ((el as any)._isShape) {
                renderShape(doc, el as any);
            } else {
                await renderField(doc, el as any, pozo);
            }
        }
    }

    return Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
}

function isValidColor(c: any): boolean {
    if (!c || typeof c !== "string") return false;
    const lower = c.trim().toLowerCase();
    return lower !== "transparent" && lower !== "none" && lower !== "";
}

function renderShape(doc: InstanceType<typeof jsPDF>, shape: ShapeElement) {
    if (shape.type === "rectangle") {
        const hasFill = isValidColor(shape.fillColor);
        if (hasFill) {
            doc.setFillColor(shape.fillColor as string);
            if (isValidColor(shape.strokeColor)) {
                doc.setDrawColor(shape.strokeColor as string);
                doc.rect(shape.x, shape.y, shape.width, shape.height, "FD");
            } else {
                doc.rect(shape.x, shape.y, shape.width, shape.height, "F");
            }
        } else {
            if (isValidColor(shape.strokeColor)) {
                doc.setDrawColor(shape.strokeColor as string);
                doc.rect(shape.x, shape.y, shape.width, shape.height, "D");
            }
        }
    }

    if (shape.type === "text" && (shape as any).content) {
        doc.setFontSize(shape.fontSize || 10);
        doc.setTextColor(isValidColor(shape.color) ? shape.color : "#000000");

        const fontWeight = (shape as any).fontWeight || "normal";
        try {
            const fontName = doc.getFont().fontName;
            doc.setFont(fontName, fontWeight === "bold" ? "bold" : "normal");
        } catch (_) { }

        const align = (shape as any).textAlign || "left";
        const padding = 2; // 2mm padding to avoid touching borders

        let textX = shape.x + padding;
        const availableWidth = Math.max(0, shape.width - (padding * 2));
        if (align === "center") textX = shape.x + shape.width / 2;
        else if (align === "right") textX = shape.x + shape.width - padding;

        const contentStr = String((shape as any).content);
        // Manual wrapping to compute total height and center vertically
        const textLines = doc.splitTextToSize(contentStr, availableWidth);
        const lineHeight = doc.getLineHeight() * 0.3527; // convert pt to mm
        const totalTextHeight = Math.max(0, (textLines.length - 1) * lineHeight);

        // Calculate Y so the middle of the block aligns to the center of the box
        // We add +1.5 mm to push the text down roughly 5px as requested by the user
        const startY = shape.y + (shape.height / 2) - (totalTextHeight / 2) + 1.5;

        doc.text(textLines, textX, startY, {
            align: align as any,
            baseline: "middle"
        });

        try {
            const fontName = doc.getFont().fontName;
            doc.setFont(fontName, "normal");
        } catch (_) { }
    }

    if (shape.type === "image" && (shape as any).imageUrl) {
        const url = (shape as any).imageUrl;
        if (url.startsWith("data:image")) {
            try {
                const fmt = url.includes("png") ? "PNG" : "JPEG";
                doc.addImage(url, fmt, shape.x, shape.y, shape.width, shape.height, undefined, "FAST");
            } catch (e) {
                console.warn(`Error añadiendo imagen estática (${shape.id}):`, e);
            }
        }
    }

    if (shape.type === "line") {
        if (isValidColor(shape.strokeColor)) {
            doc.setDrawColor(shape.strokeColor as string);
            doc.line(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
        }
    }
}

async function renderField(doc: InstanceType<typeof jsPDF>, pl: Placement, pozo: ReturnType<typeof mapFirestoreToPozo>) {
    const value = getFieldValue(pozo, pl.fieldId);

    // Borde del campo
    if (pl.borderWidth && pl.borderWidth > 0 && isValidColor(pl.borderColor)) {
        doc.setDrawColor(pl.borderColor as string);
        doc.setLineWidth(pl.borderWidth * 0.35); // px → mm aprox
        doc.rect(pl.x, pl.y, pl.width, pl.height);
    }

    // Label
    let labelH = 0;
    if (pl.showLabel) {
        const lfs = pl.labelFontSize || 8;
        labelH = lfs * 0.35 + 2; // mm
        if (isValidColor(pl.labelBackgroundColor)) {
            doc.setFillColor(pl.labelBackgroundColor as string);
            doc.rect(pl.x, pl.y, pl.width, labelH, "F");
        }
        doc.setFontSize(lfs);
        doc.setTextColor(isValidColor(pl.labelColor) ? pl.labelColor : "#000000");
        const labelText = pl.customLabel || pl.fieldId;
        doc.text(String(labelText), pl.x + pl.width / 2, pl.y + labelH / 2, { align: "center", baseline: "middle" });
    }

    const contentY = pl.y + labelH;
    const contentH = pl.height - labelH;

    // Foto
    if (pl.fieldId.startsWith("foto_") && value && value.startsWith("data:image")) {
        try {
            const base64Data = value.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, "base64");

            // Usamos imageSize para leer metadatos (dimensiones originales)
            const metadata = imageSize(imageBuffer);
            const imgW = metadata.width || 100;
            const imgH = metadata.height || 100;

            // Calcular object-fit: contain
            const ratioW = pl.width / imgW;
            const ratioH = contentH / imgH;
            const ratio = Math.min(ratioW, ratioH);

            const finalW = imgW * ratio;
            const finalH = imgH * ratio;

            // Centrar la imagen en el contenedor
            const xOffset = pl.x + (pl.width - finalW) / 2;
            const yOffset = contentY + (contentH - finalH) / 2;

            const fmt = value.includes("png") ? "PNG" : "JPEG";
            doc.addImage(value, fmt, xOffset, yOffset, finalW, finalH, undefined, "FAST");
        } catch (e) {
            console.warn(`No se pudo añadir imagen ${pl.fieldId}:`, e);
            // Fallback
            try {
                const fmt = value.includes("png") ? "PNG" : "JPEG";
                doc.addImage(value, fmt, pl.x, contentY, pl.width, contentH, undefined, "FAST");
            } catch (_) { }
        }
        return;
    }

    // Texto
    doc.setFontSize(pl.fontSize || 10);
    doc.setTextColor(isValidColor(pl.color) ? pl.color : "#000000");
    const valueStr = String(value || "-");
    const padding = 2; // 2mm padding
    const availableWidth = Math.max(0, pl.width - (padding * 2));
    const alignedX = pl.x + (pl.width / 2);

    const textLines = doc.splitTextToSize(valueStr, availableWidth);
    const lineHeight = doc.getLineHeight() * 0.3527; // mm
    const totalTextHeight = Math.max(0, (textLines.length - 1) * lineHeight);

    // +1.5 mm to push the text down roughly 5px as requested
    const startY = contentY + (contentH / 2) - (totalTextHeight / 2) + 1.5;

    doc.text(textLines, alignedX, startY, {
        align: "center",
        baseline: "middle"
    });
}

// ─────────────────────────────────────────────────
// CLOUD FUNCTION PRINCIPAL
// ─────────────────────────────────────────────────
export const generateFicha = functions
    .runWith({ timeoutSeconds: 300, memory: "1GB" }) // Aumentamos memoria para jsPDF y base64
    .https.onCall(async (data, context) => {
        // Verificar autenticación
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Se requiere autenticación.");
        }

        const { fichaId, pozo: pozoDirect, disenoId = "default" } = data as {
            fichaId?: string;
            pozo?: FichaData;
            disenoId?: string;
        };

        try {
            let baseData: FichaData;

            if (pozoDirect) {
                console.log("� Usando datos enviados directamente desde el cliente");
                baseData = pozoDirect;
            } else if (fichaId) {
                console.log(`📊 Buscando ficha en Firestore: ${fichaId}`);
                const snap = await db().collection("fichas").doc(fichaId).get();
                if (!snap.exists) {
                    throw new functions.https.HttpsError("not-found", `No se encontró la ficha: ${fichaId}`);
                }
                baseData = snap.data() as FichaData;
            } else {
                throw new functions.https.HttpsError("invalid-argument", "Se requiere fichaId o datos del pozo.");
            }

            // 1. Obtener diseño
            console.log(`🎨 Cargando diseño: ${disenoId}`);
            let disenoDoc = await db().collection("fichas_disenos").doc(disenoId).get();

            if (!disenoDoc.exists) {
                console.warn(`⚠️ Diseño ${disenoId} no encontrado. Buscando alternativa...`);
                const fallback = await db().collection("fichas_disenos").limit(1).get();
                if (!fallback.empty) {
                    disenoDoc = fallback.docs[0];
                    console.log(`✅ Usando diseño fallback: ${disenoDoc.id}`);
                } else {
                    throw new functions.https.HttpsError("not-found", `Diseño no encontrado: ${disenoId} y no existen diseños en la colección.`);
                }
            }

            const design = disenoDoc.data() as Design;

            // 2. Mapear datos
            const pozoMapeado = mapFirestoreToPozo(baseData);

            // 3. Generar PDF
            console.log("📄 Renderizando PDF...");
            const pdfBuffer = await generatePdf(design, pozoMapeado);

            // 4. Devolver PDF como base64 directamente al cliente
            const idParaFichero = fichaId || baseData.pozo || Date.now();
            const pdfBase64 = pdfBuffer.toString("base64");

            console.log(`✅ PDF generado exitosamente para: ${idParaFichero} (${pdfBuffer.length} bytes)`);
            return {
                success: true,
                pdfBase64,
                filename: `ficha_${idParaFichero}.pdf`,
                id: idParaFichero
            };

        } catch (error: any) {
            console.error("❌ Error generando ficha:", error);
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError("internal", error.message || "Error desconocido");
        }
    });
