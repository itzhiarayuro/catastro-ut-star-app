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
// LÓGICA DE VISIBILIDAD DE GRUPOS
// ─────────────────────────────────────────────────
function isGroupVisible(groupId: string | undefined, design: Design, pozo: ReturnType<typeof mapFirestoreToPozo>): boolean {
    if (!groupId) return true;

    const group = (design.groups || []).find(g => g.id === groupId);
    if (!group) return true;

    const name = group.name.toLowerCase();

    // Lógica para Entrada X
    if (name.includes("entrada")) {
        const match = name.match(/entrada\s*(\d+)/i);
        if (match) {
            const num = parseInt(match[1]);
            const entradas = pozo.pipes.filter(p => p.tipo === "entrada");
            return entradas.length >= num;
        }
    }

    // Lógica para Salida X
    if (name.includes("salida")) {
        const match = name.match(/salida\s*(\d+)/i);
        if (match) {
            const num = parseInt(match[1]);
            const salidas = pozo.pipes.filter(p => p.tipo === "salida");
            return salidas.length >= num;
        }
    }

    // Lógica para Sumidero X
    if (name.includes("sumidero")) {
        const match = name.match(/sumidero\s*(\d+)/i);
        if (match) {
            const num = parseInt(match[1]);
            return (pozo as any).sums?.length >= num;
        }
    }

    return true;
}

// ─────────────────────────────────────────────────
// RENDER PDF
// ─────────────────────────────────────────────────
async function generatePdf(design: Design, pozo: ReturnType<typeof mapFirestoreToPozo>): Promise<Buffer> {
    const orientation = design.orientation === "landscape" ? "l" : "p";
    const format = (design.pageSize ?? "Letter").toLowerCase();

    const doc = new jsPDF({ orientation, unit: "mm", format });

    const allElements = [
        ...(design.shapes ?? []).map((s: ShapeElement) => ({ ...s, _isShape: true })),
        ...(design.placements ?? []).map((p: Placement) => ({ ...p, _isShape: false })),
    ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

    const numPages = design.numPages || 1;

    for (let pageIdx = 1; pageIdx <= numPages; pageIdx++) {
        if (pageIdx > 1) doc.addPage();

        for (const el of allElements) {
            if (el.isVisible === false) continue;

            // VERIFICAR GRUPO CONDICIONAL
            if (!isGroupVisible(el.groupId, design, pozo)) continue;

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

function renderShape(doc: InstanceType<typeof jsPDF>, shape: ShapeElement) {
    if (shape.type === "rectangle") {
        const hasFill = shape.fillColor && shape.fillColor !== "transparent" && shape.fillColor !== "none";
        if (hasFill) {
            doc.setFillColor(shape.fillColor as string);
            if (shape.strokeColor) doc.setDrawColor(shape.strokeColor);
            doc.rect(shape.x, shape.y, shape.width, shape.height, shape.strokeColor ? "FD" : "F");
        } else {
            if (shape.strokeColor) doc.setDrawColor(shape.strokeColor);
            doc.rect(shape.x, shape.y, shape.width, shape.height, "D");
        }
    }

    if (shape.type === "text" && (shape as any).content) {
        doc.setFontSize(shape.fontSize || 10);
        doc.setTextColor(shape.color || "#000000");
        doc.text((shape as any).content, shape.x, shape.y + shape.height / 2, { baseline: "middle" });
    }

    if (shape.type === "line") {
        if (shape.strokeColor) doc.setDrawColor(shape.strokeColor);
        doc.line(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
    }
}

async function renderField(doc: InstanceType<typeof jsPDF>, pl: Placement, pozo: ReturnType<typeof mapFirestoreToPozo>) {
    const value = getFieldValue(pozo, pl.fieldId);

    // Borde del campo
    if (pl.borderWidth && pl.borderWidth > 0) {
        doc.setDrawColor(pl.borderColor || "#000000");
        doc.setLineWidth(pl.borderWidth * 0.35); // px → mm aprox
        doc.rect(pl.x, pl.y, pl.width, pl.height);
    }

    // Label
    let labelH = 0;
    if (pl.showLabel) {
        const lfs = pl.labelFontSize || 8;
        labelH = lfs * 0.35 + 2; // mm
        if (pl.labelBackgroundColor) {
            doc.setFillColor(pl.labelBackgroundColor);
            doc.rect(pl.x, pl.y, pl.width, labelH, "F");
        }
        doc.setFontSize(lfs);
        doc.setTextColor(pl.labelColor || "#000000");
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
    doc.setTextColor(pl.color || "#000000");
    doc.text(
        String(value || "-"),
        pl.x + pl.width / 2,
        contentY + contentH / 2,
        { align: "center", baseline: "middle", maxWidth: pl.width - 2 }
    );
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

            // 4. Guardar en Storage
            const idParaFichero = fichaId || baseData.pozo || Date.now();
            const filenameTarget = `fichas_pdf/${idParaFichero}_${Date.now()}.pdf`;
            const bucket = storage().bucket();
            const file = bucket.file(filenameTarget);

            await file.save(pdfBuffer, {
                metadata: {
                    contentType: "application/pdf",
                    metadata: { disenoId, generatedAt: new Date().toISOString() },
                },
            });

            // URL firmada válida 1 hora
            const [url] = await file.getSignedUrl({
                version: "v4",
                action: "read",
                expires: Date.now() + 60 * 60 * 1000,
            });

            console.log(`✅ PDF generado exitosamente: ${filenameTarget}`);
            return {
                success: true,
                downloadUrl: url,
                filename: filenameTarget,
                id: idParaFichero
            };

        } catch (error: any) {
            console.error("❌ Error generando ficha:", error);
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError("internal", error.message || "Error desconocido");
        }
    });
