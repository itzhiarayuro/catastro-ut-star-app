import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// jsPDF se importa como CommonJS para funcionar en Node.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { jsPDF } = require("jspdf");
import imageSize from "image-size";

const db = () => admin.firestore();
const storage = () => admin.storage();

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

const TRANSLIT_MAP: Record<string, string> = {
    '\u00E1': 'a', '\u00E9': 'e', '\u00ED': 'i', '\u00F3': 'o', '\u00FA': 'u',
    '\u00C1': 'A', '\u00C9': 'E', '\u00CD': 'I', '\u00D3': 'O', '\u00DA': 'U',
    '\u00F1': 'n', '\u00D1': 'N', '\u00FC': 'u', '\u00DC': 'U'
};

function sanitizeText(text: string | null | undefined): string {
    if (!text) return '';
    try {
        const normalized = String(text).normalize('NFC');
        return normalized.replace(
            /[\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC]/g,
            (char) => TRANSLIT_MAP[char] || char
        );
    } catch {
        return String(text);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COLECTOR DE LOGS — captura todos los mensajes para devolverlos al cliente
// ─────────────────────────────────────────────────────────────────────────────
let _pdfLogs: string[] = [];

/** Reiniciar colector antes de cada generación */
function resetLogs() { _pdfLogs = []; }

/** Log informativo — también llama console.log para Firebase Console */
function plog(msg: string) {
    const line = `[INFO]  ${msg}`;
    _pdfLogs.push(line);
    console.log(msg);
}

/** Log de advertencia */
function pwarn(msg: string) {
    const line = `[WARN]  ${msg}`;
    _pdfLogs.push(line);
    console.warn(msg);
}

/** Log de error */
function perr(msg: string) {
    const line = `[ERROR] ${msg}`;
    _pdfLogs.push(line);
    console.error(msg);
}

/** Obtener snapshot de logs actuales */
function getLogs(): string[] { return [..._pdfLogs]; }

// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface FichaData {
    tipoRegistro?: string;
    pozo?: string;
    municipio?: string;
    barrio?: string;
    fecha?: string;
    elaboro?: string;
    estadoPozo?: string;
    gps?: { lat?: number; lng?: number; x?: number; y?: number };
    coordenada_x?: number;
    coordenada_y?: number;
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
    deA?: string;
    diam?: string | number;
    mat?: string;
    cotaZ?: string | number;
    emboq?: string;
    orden?: number;
    estado?: string;
    unit?: string;
}

interface SumData {
    id?: string;
    tipo?: string;
    esquema?: string;
    codEsquema?: string;
    diam?: string | number;
    diamTub?: string | number;
    material?: string;
    matTub?: string;
    matRejilla?: string;
    matCaja?: string;
    hSalida?: string | number;
    hLlegada?: string | number;
    estado?: string;
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
    padding?: number;
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
    padding?: number;
}

interface Group {
    id: string;
    name: string;
    description?: string;
}

interface TechnicalGroup {
    id: string;
    type: 'tuberia' | 'sumidero';
    number: number;
    realIdx: number;
    kind: string;
    elements: any[];
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

    plog(`[COORD-DEBUG] coordenada_x=${JSON.stringify(data.coordenada_x)} (${typeof data.coordenada_x}) | coordenada_y=${JSON.stringify(data.coordenada_y)} (${typeof data.coordenada_y}) | gps.x=${JSON.stringify(data.gps?.x)} | gps.y=${JSON.stringify(data.gps?.y)}`);

    return {
        identificacion: {
            idPozo: fv(data.pozo),
            fecha: fv(data.fecha),
            levanto: fv(data.elaboro),
            estado: fv(data.estadoPozo),
            coordenadaX: (() => {
                const v = parseFloat(String(data.coordenada_x ?? data.gps?.x ?? ''));
                plog(`[COORD-DEBUG] coordenadaX parsed=${v} → resultado="${(!isNaN(v) && v !== 0) ? v.toFixed(3) : '-'}"`);
                return (!isNaN(v) && v !== 0) ? v.toFixed(3) : '-';
            })(),
            coordenadaY: (() => {
                const v = parseFloat(String(data.coordenada_y ?? data.gps?.y ?? ''));
                plog(`[COORD-DEBUG] coordenadaY parsed=${v} → resultado="${(!isNaN(v) && v !== 0) ? v.toFixed(3) : '-'}"`);
                return (!isNaN(v) && v !== 0) ? v.toFixed(3) : '-';
            })(),
            latitud: typeof data.gps?.lat === 'number' ? data.gps.lat.toFixed(7) : fv(data.gps?.lat),
            longitud: typeof data.gps?.lng === 'number' ? data.gps.lng.toFixed(7) : fv(data.gps?.lng),
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
        pipes: (data.pipes ?? [])
            // Ordenar: ENTRADAS primero (por orden), luego SALIDAS (por orden)
            .slice().sort((a, b) => {
                const tipoA = (a.es ?? "").toUpperCase();
                const tipoB = (b.es ?? "").toUpperCase();
                // ENTRADA = 0, SALIDA = 1, otro = 2
                const prioA = tipoA.startsWith("ENTRADA") ? 0 : tipoA.startsWith("SALIDA") ? 1 : 2;
                const prioB = tipoB.startsWith("ENTRADA") ? 0 : tipoB.startsWith("SALIDA") ? 1 : 2;
                if (prioA !== prioB) return prioA - prioB;
                // Dentro del mismo tipo, ordenar por campo 'orden'
                return (a.orden ?? 99) - (b.orden ?? 99);
            })
            .map((p, i) => {
                const diamNum = parseFloat(String(p.diam ?? 0)) || 0;
                const cotaNum = parseFloat(String(p.cotaZ ?? 0)) || 0;
                // Batea = cotaZ + (diámetro_en_mm / 1000)
                // Si el diámetro está en pulgadas, convertir: 1 pulgada = 25.4mm
                const isInches = !p.unit || p.unit === 'in';
                const diamMM = isInches ? diamNum * 25.4 : diamNum;
                const batea = cotaNum > 0 ? cotaNum + (diamMM / 1000) : 0;
                return {
                    id: fv(p.deA ?? p.id ?? `T${i + 1}`),  // deA = pozo destino/origen (M035, etc)
                    tipo: (p.es ?? "").toLowerCase(),       // ENTRADA→entrada / SALIDA→salida
                    diam: fv(p.diam),
                    mat: fv(p.mat),
                    cota: fv(p.cotaZ),
                    emboq: fv(p.emboq ?? "SI"),
                    orden: p.orden ?? i + 1,
                    estado: fv(p.estado),
                    batea: batea > 0 ? batea.toFixed(4) : "-",
                };
            }),
        fotos: (data.fotoList ?? []).map((f: any, i: number) => ({
            ...f,
            id: f.id ?? `foto-${i}`,
            nombre: f.nombre ?? f.filename ?? `foto-${i}.jpg`,
            blobId: f.blobId ?? "",
        })),
        sums: (data.sums ?? []).map((s, i) => ({
            id: fv(s.id ?? `S${i + 1}`),
            tipo: fv(s.tipo),
            esquema: fv(s.codEsquema ?? s.esquema ?? `${i + 1}`),
            diam: fv(s.diamTub ?? s.diam),
            mat: fv(s.matTub ?? s.material),
            hSalida: fv(s.hSalida),
            hLlegada: fv(s.hLlegada),
        })),
    };
}

function mapMarcacionToPozo(data: any) {
    const fv = (v: unknown) => String(v ?? "-");

    // Transformar el objeto de fotos de marcación en la lista que espera el reporte
    const fotoList: any[] = [];
    if (data.fotos) {
        if (data.fotos.panoramica) fotoList.push({ ...data.fotos.panoramica, nombre: `${data.codigo}-P.JPG` });
        if (data.fotos.tapa) fotoList.push({ ...data.fotos.tapa, nombre: `${data.codigo}-T.JPG` });
        if (data.fotos.interna) fotoList.push({ ...data.fotos.interna, nombre: `${data.codigo}-I.JPG` });
        if (data.fotos.batea) fotoList.push({ ...data.fotos.batea, nombre: `${data.codigo}-SUM1-B.JPG` });
        if (data.fotos.puntoGPS) fotoList.push({ ...data.fotos.puntoGPS, nombre: `${data.codigo}-GPS.JPG` });
    }

    return {
        identificacion: {
            idPozo: fv(data.codigo),
            fecha: fv(data.createdAt),
            levanto: fv(data.inspector),
            estado: "MARCACIÓN",
            coordenadaX: "-",
            coordenadaY: "-",
            latitud: typeof data.gps?.lat === 'number' ? data.gps.lat.toFixed(7) : fv(data.gps?.lat),
            longitud: typeof data.gps?.lng === 'number' ? data.gps.lng.toFixed(7) : fv(data.gps?.lng),
        },
        ubicacion: {
            direccion: fv(data.obs ? data.obs.substring(0, 50) : "-"),
            barrio: "-",
            municipio: fv(data.municipio),
            profundidad: "-",
        },
        componentes: {
            estructuraPavimento: "-",
            diametroCilindro: "-",
            sistema: fv(data.tipoElemento),
            existeTapa: "SÍ",
            materialTapa: "-",
            estadoTapa: "-",
            existeCono: "-",
            tipoCono: "-",
            materialCono: "-",
            estadoCono: "-",
            existeCilindro: "-",
            materialCilindro: "-",
            estadoCilindro: "-",
            existeCanuela: "-",
            materialCanuela: "-",
            estadoCanuela: "-",
            existePeldanos: "-",
            materialPeldanos: "-",
            numeroPeldanos: "-",
            estadoPeldanos: "-",
            tipoCamara: fv(data.tipoElemento),
        },
        observaciones: { observaciones: fv(data.obs) },
        pipes: [] as any[],
        fotos: fotoList.map((f: any, i: number) => ({
            ...f,
            id: f.id ?? `foto-${i}`,
            nombre: f.nombre ?? f.filename ?? `foto-${i}.jpg`,
            blobId: f.blobId ?? "",
        })),
        sums: [] as any[],
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
        pozo_maps_url: (() => {
            const lat = pozo.identificacion.latitud;
            const lng = pozo.identificacion.longitud;
            if (lat && lat !== '-' && lng && lng !== '-') {
                return `https://www.google.com/maps?q=${lat},${lng}`;
            }
            return '-';
        })(),
    };

    if (fieldId in MAP) return MAP[fieldId];

    // ─── TUBERÍAS DINÁMICAS ───
    // Formato de la plantilla: tub_N_prop, ent_N_prop, sal_N_prop
    // tub_N = tuberías de entrada (1 a 5) (su foto asociada es foto_entrada_N)
    // ent_N = entrada por número (6 y 7)
    // sal_N = salida por número (1 y 2)
    const PIPE_PROP_MAP: Record<string, string> = {
        id: 'id', diametro: 'diam', material: 'mat',
        z: 'cota', emboquillado: 'emboq', estado: 'estado', batea: 'batea',
    };

    // Función auxiliar para obtener propiedades de la tubería
    const getPipeProp = (pipes: any[], idx: number, propKey: string): string => {
        const pipe = pipes[idx];
        if (pipe) {
            let val = (pipe as any)[propKey] ?? "-";
            if (propKey === 'id' && typeof val === 'string' && (val.startsWith('FOTO_') || val.startsWith('INF-'))) {
                return "-";
            }
            return String(val);
        }
        return "-";
    };

    const tubMatch = fieldId.match(/^tub_(\d+)_([a-zA-Z]+)$/);
    if (tubMatch) {
        const idx = parseInt(tubMatch[1]) - 1;
        const propKey = PIPE_PROP_MAP[tubMatch[2]] ?? tubMatch[2];
        const pipes = pozo.pipes.filter(p => ((p as any).es || '').toLowerCase().startsWith('entrada'));
        return getPipeProp(pipes, idx, propKey);
    }

    const pipeMatch = fieldId.match(/^(ent|sal)_(\d+)_([a-zA-Z]+)$/);
    if (pipeMatch) {
        const tipoTarget = pipeMatch[1] === "ent" ? "entrada" : "salida";
        const propKey = PIPE_PROP_MAP[pipeMatch[3]] ?? pipeMatch[3];
        const idx = parseInt(pipeMatch[2]) - 1;
        const pipes = pozo.pipes.filter(p => ((p as any).es || '').toLowerCase().startsWith(tipoTarget));
        return getPipeProp(pipes, idx, propKey);
    }

    // ─── SUMIDEROS DINÁMICOS ───
    // Formato: sum_N_prop (sum_1_id, sum_1_esquema, sum_1_tipo, sum_1_diametro, etc.)
    const SUM_PROP_MAP: Record<string, string> = {
        id: 'id', esquema: 'esquema', tipo: 'tipo',
        diametro: 'diam', material: 'mat',
        hSalida: 'hSalida', hLlegada: 'hLlegada',
    };
    const sumMatch = fieldId.match(/^sum_(\d+)_([a-zA-Z]+)$/);
    if (sumMatch) {
        const idx = parseInt(sumMatch[1]) - 1;
        const propKey = SUM_PROP_MAP[sumMatch[2]] ?? sumMatch[2];
        const sum = pozo.sums[idx];
        if (sum) return (sum as any)[propKey] ?? "-";
        return "-";
    }

    // ─── FOTOS ───
    // Mapa: fieldId → código base (SIN sufijo -T para búsqueda)
    // La lógica de resolución prioriza la foto principal (-T) sobre zoom (-Z, -AT)
    const FOTO_BASE_CODE_MAP: Record<string, string> = {
        foto_panoramica: "P",
        foto_tapa: "T",
        foto_interior: "I",
        foto_shape: "L",      // fallback también busca _ARGIS y ESQUEMA
        foto_entrada_1: "E1", foto_entrada_2: "E2", foto_entrada_3: "E3",
        foto_entrada_4: "E4", foto_entrada_5: "E5", foto_entrada_6: "E6",
        foto_entrada_7: "E7",
        foto_salida_1: "S1",  foto_salida_2: "S2",  foto_salida_3: "S3",
        foto_salida_4: "S4",  foto_salida_5: "S5",  foto_salida_6: "S6",
        foto_salida_7: "S7",
        foto_sumidero_1: "SUM1", foto_sumidero_2: "SUM2", foto_sumidero_3: "SUM3",
        foto_sumidero_4: "SUM4", foto_sumidero_5: "SUM5", foto_sumidero_6: "SUM6",
        foto_sumidero_7: "SUM7",
        foto_sum_batea_1: "SUM1-B",
    };

    if (fieldId in FOTO_BASE_CODE_MAP) {
        const baseCode = FOTO_BASE_CODE_MAP[fieldId]; // e.g. "S1"

        // Helper: ¿una foto es de tipo zoom (o auxiliar como diámetro/batea)?
        const isZoom = (nombre: string) => {
            const n = nombre.toUpperCase();
            return n.endsWith('-Z.JPG') || n.endsWith('_Z.JPG') ||
                   n.endsWith('-D.JPG') || n.endsWith('_D.JPG') ||
                   n.endsWith('-B.JPG') || n.endsWith('_B.JPG') ||
                   n.endsWith('-AT.JPG') || n.endsWith('_AT.JPG') ||
                   n.includes('-Z-') || n.includes('_Z_');
        };

        // Helper: ¿una foto coincide con el código base?
        const matchesCode = (nombre: string, code: string) => {
            const n = nombre.toUpperCase();
            // Coincidencia exacta: -S1. o -S1- o _S1.
            if (new RegExp(`[-_]${code}[-_.]`).test(n)) return true;
            // Coincidencia al final: -S1.JPG
            if (new RegExp(`[-_]${code}\\.[A-Z]+$`).test(n)) return true;
            return false;
        };

        // Caso especial foto_shape: buscar L, _ARGIS o ESQUEMA
        if (fieldId === 'foto_shape') {
            const allFotos = pozo.fotos.filter(f => {
                const n = (f.nombre ?? '').toUpperCase();
                return n.endsWith('-L.JPG') || n.includes('_ARGIS') ||
                       n.includes('ESQUEMA') || n.endsWith('-L.PNG');
            });
            const foto = allFotos.find(f => f.blobId) ?? null;
            plog(`[PDF-PHOTO] ${foto ? '✅' : '❌'} Field: ${fieldId} | Code: L | Found: ${foto ? (foto.nombre ?? '?') : 'MISSING (no _ARGIS/ESQUEMA found)'}`);
            return foto?.blobId ?? null;
        }

        // Candidatos: todas las fotos que coinciden con el código base
        const candidates = pozo.fotos.filter(f => {
            const n = (f.nombre ?? "").toUpperCase();
            return matchesCode(n, baseCode);
        });

        let foto: typeof pozo.fotos[0] | undefined;

        if (candidates.length > 0) {
            // Priorizar foto principal (-T) sobre zoom (-Z, -AT)
            const principal = candidates.find(f => !isZoom(f.nombre ?? ''));
            foto = principal ?? candidates[0]; // fallback al primer candidato si todos son zoom
        }
        // Log diagnóstico
        if (foto?.blobId) {
            plog(`[PDF-PHOTO] ✅ Field: ${fieldId} | Match: ${baseCode} | File: ${foto.nombre ?? '?'}`);
        } else {
            pwarn(`[PDF-PHOTO] ❌ MISSING: ${fieldId} (Code: ${baseCode}) | candidates=${candidates.length} | fotos: ${pozo.fotos.map(f => f.nombre).join(', ')}`);
        }
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

    // Detectar fotos de Página 2 (entradas, salidas, sumideros)
    // Acepta sufijos: -E1.JPG, -E1-T.JPG, -E1-Z.JPG, _E1.JPG, etc.
    const page2PhotoRegex = /[-_](E|S|SUM)\d+(-[A-Z]+)?\.[A-Z]+$/i;
    const hasPage2Photos = pozo.fotos.some(f => {
        return page2PhotoRegex.test(f.nombre || "");
    });

    const shouldSkip = !hasPipes && !hasSums && !hasPage2Photos;
    plog(`[PAGE2-CHECK] hasPipes=${hasPipes} hasSums=${hasSums} hasPage2Photos=${hasPage2Photos} → skip=${shouldSkip}`);
    if (hasPipes) plog(`  Pipes: ${pozo.pipes.map(p => `${p.tipo}#${p.orden}(${p.id})`).join(', ')}`);
    if (hasSums)  plog(`  Sums: ${pozo.sums.map(s => `${s.id}(${s.esquema})`).join(', ')}`);
    return shouldSkip;
}

function applySmartLayout(elements: any[], design: Design, pozo: ReturnType<typeof mapFirestoreToPozo>): any[] {
    const page1Elements = elements.filter(el => (el.pageNumber || 1) === 1 || el.repeatOnEveryPage);
    const page2Elements = elements.filter(el => (el.pageNumber || 1) === 2 && !el.repeatOnEveryPage);
    const otherPageElements = elements.filter(el => (el.pageNumber || 1) > 2);

    // 1. Identificar "Anclas" (Títulos como ENTRADA 1, SUMIDERO 2, etc.)
    const technicalGroups: Map<string, TechnicalGroup> = new Map();
    
    // Función para normalizar nombres
    const getGroupKey = (kind: string, num: number) => `${kind}_${num}`;

    // Crear grupos pre-definidos (los 14 posibles)
    for (let i = 1; i <= 7; i++) {
        const id = getGroupKey('entrada', i);
        technicalGroups.set(id, { id, kind: 'entrada', number: i, type: 'tuberia', elements: [], hasRealData: false, realIdx: 0 });
    }
    for (let i = 8; i <= 9; i++) {
        const id = getGroupKey('salida', i);
        technicalGroups.set(id, { id, kind: 'salida', number: i, type: 'tuberia', elements: [], hasRealData: false, realIdx: 0 });
    }
    for (let i = 1; i <= 6; i++) {
        const id = getGroupKey('sumidero', i);
        technicalGroups.set(id, { id, kind: 'sumidero', number: i, type: 'sumidero', elements: [], hasRealData: false, realIdx: 0 });
    }

    // 2. Clasificación voraz de elementos
    const assignedIds = new Set<string>();

    // Paso A: Agrupar por UUID de groupId y deducir el grupo técnico desde los fieldId
    // Los groupIds en el diseño son UUIDs, no strings legibles. Se deduce el tipo
    // mirando el patrón del fieldId de los elementos del cluster.
    const uuidClusters = new Map<string, any[]>();
    page2Elements.forEach(el => {
        const gid = el.groupId ? String(el.groupId) : null;
        if (gid) {
            if (!uuidClusters.has(gid)) uuidClusters.set(gid, []);
            uuidClusters.get(gid)!.push(el);
        }
    });

    // Deducir el grupo técnico a partir del fieldId de los placements en el cluster
    const resolveGroupKey = (clusterEls: any[]): string | null => {
        for (const el of clusterEls) {
            if (el._isShape || !el.fieldId) continue;
            const fid: string = String(el.fieldId);
            // foto_entrada_N / foto_salida_N / foto_sumidero_N
            const fotoM = fid.match(/^foto_(entrada|salida|sumidero)_(\d+)$/);
            if (fotoM) {
                const kind = fotoM[1];
                const num = parseInt(fotoM[2]);
                // salidas se almacenan como salida_8, salida_9 (7 + orden)
                return kind === 'salida' ? getGroupKey('salida', 7 + num) : getGroupKey(kind, num);
            }
            // tub_N_* → entrada N
            const tubM = fid.match(/^tub_(\d+)_/);
            if (tubM) return getGroupKey('entrada', parseInt(tubM[1]));
            // ent_N_* → entrada N (para N 6-7 la plantilla usa ent_ en lugar de tub_)
            const entM = fid.match(/^ent_(\d+)_/);
            if (entM) return getGroupKey('entrada', parseInt(entM[1]));
            // sal_N_* → salida N (número visual 1-2 → almacenado como 8-9)
            const salM = fid.match(/^sal_(\d+)_/);
            if (salM) return getGroupKey('salida', 7 + parseInt(salM[1]));
            // sum_N_* → sumidero N
            const sumM = fid.match(/^sum_(\d+)_/);
            if (sumM) return getGroupKey('sumidero', parseInt(sumM[1]));
        }
        return null;
    };

    uuidClusters.forEach((clusterEls, uuid) => {
        const key = resolveGroupKey(clusterEls);
        if (key && technicalGroups.has(key)) {
            const g = technicalGroups.get(key)!;
            clusterEls.forEach(el => {
                g.elements.push(el);
                assignedIds.add(el.id);
            });
            plog(`    [PASO-A] UUID ${uuid.substring(0, 8)} → ${key} (${clusterEls.length} elementos)`);
        }
    });

    // Paso B: Asignar por texto de cabecera (Anclas)
    page2Elements.forEach(el => {
        if (assignedIds.has(el.id)) return;
        if (el._isShape && (el.content || el.text)) {
            const content = String(el.content || el.text || "").toUpperCase();
            for (const [key, g] of technicalGroups) {
                const label = `${g.kind} ${g.number}`.toUpperCase();
                const salNum = g.kind === 'salida' ? g.number - 7 : -1;
                if (content === label || content === `TUBERIA ${g.number}` || (salNum > 0 && content === `SALIDA ${salNum}`)) {
                    g.elements.push(el);
                    assignedIds.add(el.id);
                    plog(`    [ANCHOR] Found anchor for ${key}: "${content}"`);
                    break;
                }
            }
        }
    });

    // Paso C: Asignar todo lo que esté "cerca" de un ancla o campo ya asignado (Espacial)
    const remainingElements = page2Elements.filter(el => !assignedIds.has(el.id));
    remainingElements.forEach(el => {
        const elX = el.x || 0;
        const elY = el.y || 0;
        const elW = el.width || 0;
        const elH = el.height || 0;
        const midX = elX + elW/2;
        const midY = elY + elH/2;

        let bestGroup: TechnicalGroup | null = null;
        let minDist = 999999;

        technicalGroups.forEach(g => {
            if (g.elements.length === 0) return;
            // Encontrar el elemento más cercano de este grupo
            g.elements.forEach(ge => {
                const dx = midX - (ge.x + ge.width/2);
                const dy = midY - (ge.y + ge.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Si está cerca (< 60mm) es muy probable que sea del mismo bloque (las cajas miden ~65mm de ancho)
                if (dist < 60 && dist < minDist) {
                    minDist = dist;
                    bestGroup = g;
                }
            });
        });

        // Solo asignar si no es un marco gigante (más de media página)
        if (bestGroup && elW < 140 && elH < 200) {
            (bestGroup as TechnicalGroup).elements.push(el);
            assignedIds.add(el.id);
        }
    });

    // 4. Reposicionar grupos que sí tienen datos
    // Primero ordenar y asignar realIdx, LUEGO evaluar hasRealData (usa realIdx)
    const allTuberias = Array.from(technicalGroups.values()).filter(g => g.type === 'tuberia' && g.elements.length > 0);
    const allSums = Array.from(technicalGroups.values()).filter(g => g.type === 'sumidero' && g.elements.length > 0);

    allTuberias.sort((a, b) => a.number - b.number);
    allTuberias.forEach((g, idx) => { g.realIdx = idx; });

    allSums.sort((a, b) => a.number - b.number);
    allSums.forEach((g, idx) => { g.realIdx = idx; });

    // Evaluar hasRealData con realIdx ya correcto
    allTuberias.forEach(g => { g.hasRealData = checkHasRealData(g, pozo); });
    allSums.forEach(g => { g.hasRealData = checkHasRealData(g, pozo); });

    // Diagnóstico
    plog(`[SMART-LAYOUT] Resumen Final:`);
    [...allTuberias, ...allSums].forEach(g => {
        const status = g.hasRealData ? "✅ MOSTRAR" : "❌ OCULTAR";
        plog(`  - ${g.id}: ${g.elements.length} elementos -> ${status}`);
    });

    const tuberias = allTuberias.filter(g => g.hasRealData);
    const sums = allSums.filter(g => g.hasRealData);

    const startY = 46;
    const maxY = 265;

    // 3 columnas fijas: Entradas | Salidas | Sumideros
    const entradas = tuberias.filter(g => g.kind === 'entrada');
    const salidas  = tuberias.filter(g => g.kind === 'salida');

    const repoEntradas = repositionGroupsFlow(entradas, [10],     startY, maxY, 2);
    const repoSalidas  = repositionGroupsFlow(salidas,  [74.67],  startY, maxY, 2);
    const repoSums     = repositionGroupsFlow(sums,     [139.34], startY, maxY, 2);

    // Los elementos decorativos que sobraron (logos, cabeceras generales) se quedan igual
    const finalDecorative = page2Elements.filter(el => !assignedIds.has(el.id));
    plog(`[SMART-LAYOUT] Entradas: ${entradas.length} | Salidas: ${salidas.length} | Sumideros: ${sums.length} | Decorativos: ${finalDecorative.length}`);

    return [
        ...page1Elements,
        ...repoEntradas,
        ...repoSalidas,
        ...repoSums,
        ...finalDecorative,
        ...otherPageElements
    ];
}

function buildTechnicalGroups(elements: any[], pozo: ReturnType<typeof mapFirestoreToPozo>): TechnicalGroup[] {
    const groupsMap: Record<string, TechnicalGroup> = {};

    elements.forEach(el => {
        const fid = (el.fieldId as string) || "";
        let type: 'tuberia' | 'sumidero' | null = null;
        let num = 0; 
        let realIdx = 0; 
        let kind = 'entrada'; 

        const tubMatch = fid.match(/^tub_(\d+)_[a-zA-Z]+$/);
        const pipeMatch = fid.match(/^(ent|sal)_(\d+)_[a-zA-Z]+$/);
        const sumMatch = fid.match(/^sum_(\d+)_[a-zA-Z]+$/);
        const fotoMatch = fid.match(/^foto_(entrada|salida|sumidero)_(\d+)$/);

        if (tubMatch) {
            type = 'tuberia';
            num = parseInt(tubMatch[1]);
            realIdx = num - 1;
            kind = 'entrada';
        } else if (pipeMatch) {
            type = 'tuberia';
            const rawNum = parseInt(pipeMatch[2]);
            if (pipeMatch[1] === 'ent') {
                num = rawNum;
                realIdx = rawNum - 1;
                kind = 'entrada';
            } else {
                num = 7 + rawNum; 
                realIdx = rawNum - 1;
                kind = 'salida';
            }
        } else if (sumMatch) {
            type = 'sumidero';
            num = parseInt(sumMatch[1]);
            realIdx = num - 1;
            kind = 'sumidero';
        } else if (fotoMatch) {
            const fotoKind = fotoMatch[1];
            const rawNum = parseInt(fotoMatch[2]);
            if (fotoKind === 'entrada') {
                type = 'tuberia';
                num = rawNum;
                realIdx = rawNum - 1;
                kind = 'entrada';
            } else if (fotoKind === 'salida') {
                type = 'tuberia';
                num = 7 + rawNum;
                realIdx = rawNum - 1;
                kind = 'salida';
            } else {
                type = 'sumidero';
                num = rawNum;
                realIdx = rawNum - 1;
                kind = 'sumidero';
            }
        }

        if (type && num) {
            const key = `${type}_${num}`;
            if (!groupsMap[key]) {
                groupsMap[key] = { id: key, type, number: num, realIdx, kind, elements: [], hasRealData: false };
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
    const isClean = (s: any) => {
        const str = String(s || '').trim().toUpperCase();
        if (!str || str === '-' || str === '.' || str === '0' || str === '0.00' || str === '0,00' || str === 'N/A' || str === 'DESCONOCIDO') return false;
        if (str.replace(/-/g, '') === '') return false;
        return true;
    };

    if (group.type === 'tuberia') {
        const pipeList = pozo.pipes.filter(p => (p.tipo || "").toLowerCase().startsWith(group.kind.toLowerCase()));
        const pipe = pipeList[group.realIdx];
        
        let hasTechnicalData = false;
        if (pipe) {
            const deA = String(pipe.id || '');
            const hasDiam = isClean(pipe.diam);
            const hasMat = isClean(pipe.mat);
            const hasCota = isClean(pipe.cota);
            const hasEstado = isClean(pipe.estado);
            const hasDeA = isClean(deA) && !/^T\d+$/.test(deA.toUpperCase()) && 
                           !deA.toUpperCase().startsWith('FOTO_') && !deA.toUpperCase().startsWith('INF-');

            hasTechnicalData = hasDiam || hasMat || hasCota || hasEstado || hasDeA;
        }

        const photoNum = (group.kind === 'salida') ? (group.number - 7) : group.number;
        const code = (group.kind === 'entrada' ? 'E' : 'S') + photoNum;
        
        const hasPhoto = pozo.fotos.some((f: any) => {
            const subcat = String(f.subcategoria || f.categoria || '').toUpperCase();
            const filename = String(f.nombre || f.filename || '').toUpperCase();
            const tipo = String(f.tipo || '').toUpperCase();

            return subcat === code ||
                   subcat.includes(`-${code}`) ||
                   filename.includes(`-${code}.`) ||
                   filename.includes(`-${code}-`) ||
                   filename.endsWith(`-${code}`) ||
                   tipo === code ||
                   new RegExp(`[-_]${code}([-_][A-Z]+)?\\.[A-Z]+$`).test(filename);
        });

        return hasTechnicalData || hasPhoto;
    }

    if (group.type === 'sumidero') {
        const sum = pozo.sums[group.realIdx];
        let hasTechnicalData = false;
        if (sum) {
            const diam = parseFloat(String(sum.diam || '0'));
            const mat = String(sum.mat || '').toUpperCase();
            const hSalida = parseFloat(String(sum.hSalida || '0'));
            const tipo = String(sum.tipo || '').toUpperCase();

            const hasDiam = !isNaN(diam) && diam > 0;
            const hasMat = mat !== '' && mat !== '-' && mat !== 'DESCONOCIDO';
            const hasH = !isNaN(hSalida) && hSalida > 0;
            const hasTipo = tipo !== '' && tipo !== '-' && tipo !== 'DESCONOCIDO';

            hasTechnicalData = hasDiam || hasMat || hasH || hasTipo;
        }

        const photoNum = group.realIdx + 1;
        const code = `SUM${photoNum}`;
        const hasPhoto = pozo.fotos.some((f: any) => {
            const subcat = String(f.subcategoria || f.categoria || '').toUpperCase();
            const filename = String(f.nombre || f.filename || '').toUpperCase();
            const tipo = String(f.tipo || '').toUpperCase();

            return subcat === code ||
                   subcat.includes(code) ||
                   filename.includes(`-${code}.`) ||
                   filename.includes(`-${code}-`) ||
                   filename.endsWith(`-${code}`) ||
                   tipo === code;
        });

        const show = hasTechnicalData || hasPhoto;
        if (show) {
            plog(`  [LAYOUT] sumidero#${photoNum} → MOSTRAR (info:${hasTechnicalData}, foto:${hasPhoto})`);
        }
        return show;
    }
    return false;
}

function repositionGroupsFlow(groups: TechnicalGroup[], columnsX: number[], startY: number, maxY: number, pageNumber: number): any[] {
    let currentY = startY;
    let colIdx = 0;
    const result: any[] = [];
    const GROUP_GAP = 5;

    groups.sort((a, b) => {
        if (a.kind === 'entrada' && b.kind === 'salida') return -1;
        if (a.kind === 'salida' && b.kind === 'entrada') return 1;
        return a.number - b.number;
    });

    groups.forEach(g => {
        const minY = Math.min(...g.elements.map(el => el.y));
        const gHeight = Math.max(...g.elements.map(el => el.y + el.height)) - minY;

        // Overflow: if moving to the next group exceeds maxY, go to next column
        if (currentY + gHeight > maxY && colIdx < columnsX.length - 1) {
            colIdx++;
            currentY = startY;
        }

        const colX = columnsX[colIdx];

        g.elements.forEach(el => {
            const relY = el.y - minY;
            const relX = el.x - Math.min(...g.elements.map(e => e.x));

            el.x = colX + relX;
            el.y = currentY + relY;
            el.pageNumber = pageNumber;
            result.push(el);
        });

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

    // Diagnóstico inicial
    plog(`[PDF-START] Pipes: ${pozo.pipes.length} | Sums: ${pozo.sums.length} | Fotos: ${pozo.fotos.length}`);
    pozo.fotos.forEach((f, i) => plog(`  [FOTO-${i}] ${f.nombre} blobId=${f.blobId ? f.blobId.substring(0, 20) + '..' : 'NULL'}`));

    // 0. Prensa de Precisión: Normalizar todas las coordenadas y dimensiones
    const round = (n: any) => typeof n === "number" ? Math.round(n * 100) / 100 : n;
    plog(`🎯 Prensa de Precisión: Coordenadas y dimensiones normalizadas a 2 decimales.`);
    if (design.placements) {
        design.placements.forEach(p => {
            p.x = round(p.x); p.y = round(p.y);
            p.width = round(p.width); p.height = round(p.height);
        });
    }
    if (design.shapes) {
        design.shapes.forEach(s => {
            s.x = round(s.x); s.y = round(s.y);
            s.width = round(s.width); s.height = round(s.height);
        });
    }

    const doc = new jsPDF({ orientation, unit: "mm", format });

    let allElements = [
        ...(design.shapes ?? []).map((s: ShapeElement) => ({ ...s, _isShape: true })),
        ...(design.placements ?? []).map((p: Placement) => ({ ...p, _isShape: false })),
    ];

    // Diagnóstico de elementos por página
    const p2elements = allElements.filter(el => (el as any).pageNumber === 2);
    plog(`[PDF-DESIGN] Total elementos: ${allElements.length} | Página 2: ${p2elements.length}`);
    if (p2elements.length === 0) {
        pwarn(`[PDF-DESIGN] ⚠️ NO HAY ELEMENTOS CON pageNumber===2 en el diseño! Verificar JSON del diseño.`);
    }

    // Aplicar Smart Layout
    const skipP2 = checkIfPage2ShouldBeSkipped(pozo);
    plog(`[PDF-PAGES] skipPage2=${skipP2}`);

    if (!skipP2) {
        plog(`📄 Aplicando Smart Layout para Página 2...`);
        allElements = applySmartLayout(allElements, design, pozo);
    }

    allElements.sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

    const numPages = skipP2 ? 1 : (design.numPages || 1);
    plog(`[PDF-PAGES] Renderizando ${numPages} página(s)`);

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
        const padding = Number((shape as any).padding ?? 0);

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
        // Se elimina el offset hardcoded de +1.5 para permitir alineación perfecta
        const startY = shape.y + (shape.height / 2) - (totalTextHeight / 2);

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
        // RESPETAR MILIMETROS: Si el diseño dice 1, es 1mm. 
        // Se elimina la multiplicación por 0.3528 que reducía grosores.
        doc.setLineWidth(pl.borderWidth); 
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

        let labelText = pl.customLabel || pl.fieldId;
        // Excepción Marinilla: eliminar el sufijo indicativo (P) de la etiqueta
        if (pozo.ubicacion.municipio === "MARINILLA") {
            labelText = labelText.replace(" (P)", "");
        }

        doc.text(String(labelText), pl.x + pl.width / 2, pl.y + labelH / 2, { align: "center", baseline: "middle" });
    }

    const contentY = pl.y + labelH;
    const contentH = Math.max(1, pl.height - labelH);

    // Foto
    if (pl.fieldId.startsWith("foto_") && value) {
        let finalValue = String(value);
        if (!finalValue.startsWith("data:image") && finalValue.length > 100) {
            // Si parece base64 pero no tiene cabecera, asumimos JPEG
            finalValue = "data:image/jpeg;base64," + finalValue;
            plog(`[PDF-PHOTO] 🛠️ Autorepaired missing header for ${pl.fieldId}`);
        }

        if (finalValue.startsWith("data:image")) {
            try {
                const base64Data = finalValue.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, "base64");

                // Usamos imageSize para leer metadatos (dimensiones originales)
                const metadata = imageSize(imageBuffer);
                const imgW = metadata.width || 100;
                const imgH = metadata.height || 100;

                const padding = Number((pl as any).padding ?? 0);
                const fitW = Math.max(1, pl.width - (padding * 2));
                const fitH = Math.max(1, contentH - (padding * 2));

                // Calcular object-fit: contain dentro del área con padding
                const ratioW = fitW / imgW;
                const ratioH = fitH / imgH;
                const ratio = Math.min(ratioW, ratioH);

                const finalW = imgW * ratio;
                const finalH = imgH * ratio;

                // Centrar la imagen en el contenedor respectivo
                const xOffset = pl.x + padding + (fitW - finalW) / 2;
                const yOffset = contentY + padding + (fitH - finalH) / 2;

                const fmt = finalValue.includes("png") ? "PNG" : "JPEG";
                doc.addImage(finalValue, fmt, xOffset, yOffset, finalW, finalH, undefined, "FAST");
            } catch (e) {
                console.warn(`No se pudo añadir imagen ${pl.fieldId}:`, e);
                // Fallback
                try {
                    const fmt = finalValue.includes("png") ? "PNG" : "JPEG";
                    doc.addImage(finalValue, fmt, pl.x, contentY, pl.width, contentH, undefined, "FAST");
                } catch (_) { }
            }
            return;
        }
    }

    // Texto (con transliteración de acentos)
    doc.setFontSize(pl.fontSize || 10);
    const valueStr = sanitizeText(String(value || "-"));
    const isMapsUrl = pl.fieldId === 'pozo_maps_url' && valueStr !== '-';

    // Color azul para el enlace de Maps, color del diseño para el resto
    doc.setTextColor(isMapsUrl ? '#1a73e8' : (isValidColor(pl.color) ? pl.color : "#000000"));

    // Respetar padding del diseño (default a 0 para máxima precisión si no existe)
    const padding = Number((pl as any).padding ?? 0);
    const availableWidth = Math.max(0, pl.width - (padding * 2));
    const textLines = doc.splitTextToSize(valueStr, availableWidth);
    const lineHeight = doc.getLineHeight() * 0.3527; // mm
    const totalTextHeight = Math.max(0, (textLines.length - 1) * lineHeight);

    // Se elimina el offset de +1.5 para permitir ajuste milimétrico desde el diseñador
    const startY = contentY + (contentH / 2) - (totalTextHeight / 2);

    const textAlign = pl.textAlign || "center";
    let alignedX = pl.x + (pl.width / 2); // Default center

    if (textAlign === "left") {
        alignedX = pl.x + padding;
    } else if (textAlign === "right") {
        alignedX = pl.x + pl.width - padding;
    }

    doc.text(textLines, alignedX, startY, {
        align: textAlign as "left" | "center" | "right",
        baseline: "middle"
    });

    // Anotación de enlace clicable para el campo Maps
    if (isMapsUrl) {
        doc.link(pl.x, contentY, pl.width, contentH, { url: valueStr });
    }
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
            // Reiniciar colector de logs para esta invocación
            resetLogs();
            plog(`═══════════════════════════════════════════`);
            plog(`🚀 generateFicha iniciado: ${new Date().toISOString()}`);

            let baseData: FichaData;

            if (pozoDirect) {
                plog(`📥 Usando datos enviados directamente desde el cliente`);
                baseData = pozoDirect;
            } else if (fichaId) {
                plog(`📊 Buscando ficha en Firestore: ${fichaId}`);
                const snap = await db().collection("fichas").doc(fichaId).get();
                if (!snap.exists) {
                    throw new functions.https.HttpsError("not-found", `No se encontró la ficha: ${fichaId}`);
                }
                baseData = snap.data() as FichaData;
                plog(`[FICHA-RAW] pipes=${(baseData.pipes ?? []).length} sums=${(baseData.sums ?? []).length} fotos=${(baseData.fotoList ?? []).length}`);
            } else {
                throw new functions.https.HttpsError("invalid-argument", "Se requiere fichaId o datos del pozo.");
            }

            // 1. Obtener diseño
            plog(`🎨 Cargando diseño: ${disenoId}`);
            let disenoDoc = await db().collection("fichas_disenos").doc(disenoId).get();

            if (!disenoDoc.exists) {
                pwarn(`⚠️ Diseño ${disenoId} no encontrado. Buscando alternativa...`);
                const fallback = await db().collection("fichas_disenos").limit(1).get();
                if (!fallback.empty) {
                    disenoDoc = fallback.docs[0];
                    plog(`✅ Usando diseño fallback: ${disenoDoc.id}`);
                } else {
                    throw new functions.https.HttpsError("not-found", `Diseño no encontrado: ${disenoId} y no existen diseños en la colección.`);
                }
            }

            const design = disenoDoc.data() as Design;

            // 2. Mapear datos detectando el tipo de registro
            const tipo = baseData.tipoRegistro || 'FICHA_TECNICA';
            console.log(`🧭 Tipo de registro detectado: ${tipo}`);

            const pozoMapeado = tipo === 'MARCACION_STAR'
                ? mapMarcacionToPozo(baseData)
                : mapFirestoreToPozo(baseData);

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
                id: idParaFichero,
                debugLogs: getLogs()
            };

        } catch (error: any) {
            console.error("❌ Error generando ficha:", error);
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError("internal", error.message || "Error desconocido");
        }
    });
