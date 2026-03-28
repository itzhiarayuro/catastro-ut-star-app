/**
 * Definición formal de tipos para el sistema de Catastro UT Star
 * Centraliza interfaces y constantes para asegurar consistencia en el sistema.
 */

export interface GPSData {
    lat: number | null;
    lng: number | null;
    precision: number | null;
}

export interface ComponentState {
    existe: string;
    mat: string;
    estado: string;
    tipo?: string;
    num?: number;
}

export interface Pipe {
    id: string;
    es: 'ENTRADA' | 'SALIDA' | 'SUMIDERO';
    deA: string;
    diam: string;
    mat: string;
    estado: string;
    cotaZ: string;
    emboq: string;
    unit?: 'mm' | 'in';
    angle?: number;
    tipo?: string;
    orden?: number;
}

export interface Sumidero {
    id: string;
    tipo: string;
    matRejilla: string;
    matCaja: string;
    hSalida: string;
    hLlegada: string;
    estado: string;
    codEsquema: string;
    diamTub: string;
    matTub: string;
    unitTub?: 'mm' | 'in';
    orden?: number;
}

export interface FotoRegistro {
    id: string;
    pozoId: string;
    idPozo?: string; // Some legacy code uses idPozo
    municipio?: string;
    barrio?: string;
    filename: string;
    blobId?: string;
    categoria: string;
    inspector?: string;
    timestamp?: number;
    synced?: boolean;
    // Extended fields from fotoProcessor
    tipo?: "general" | "tapa" | "interior" | "medicion" | "entrada" | "salida" | "sumidero" | "esquema" | "ubicacion" | "tuberia_tapa" | "sumidero_tapa" | "diametro" | "batea";
    subcategoria?: string;
    sumideroAsociado?: string;
    esMedicion?: boolean;
    esExcluido?: boolean;
    motivoExclusion?: string;
}

export interface AppState {
    pozo: string;
    alias?: string;
    fecha: string;
    barrio: string;
    municipio: string;
    direccion: string;
    elaboro: string;
    sistema: string;
    rasante: string;
    estadoPozo: string;
    gps: GPSData;
    diam: number;
    altura: number;
    pendiente: string;
    camara: string;
    tapa: ComponentState;
    cargue: ComponentState;
    cuerpo: ComponentState;
    cono: ComponentState;
    canu: ComponentState;
    peld: ComponentState;
    pipes: Pipe[];
    sums: Sumidero[];
    photos: {
        general: string[];
        interior: string[];
        danos: string[];
        esquemaVertical: string[];
        ubGeneral: string[];
    };
    fotoList: FotoRegistro[];
    obs: string;
    reviso: string;
    aprobo: string;
    createdAt: string | null;
    id: string | null;
    savedAt?: string;
    zRasante?: number;
    synced?: boolean;
    contingencia?: boolean;
    contingenciaMotivo?: string;
    deleted?: boolean;
    createdBy?: string;
    creatorEmail?: string;
    creatorDisplayName?: string;
    coordenada_x?: number;
    coordenada_y?: number;
    cilindro?: ComponentState;
    placaBase?: ComponentState;
    notas?: string;
    tipoCamara?: string;
    sumideros?: Sumidero[];
    diametro?: number;
}

export const INITIAL_STATE: AppState = {
    pozo: '',
    alias: '',
    fecha: new Date().toISOString().split('T')[0],
    barrio: '',
    municipio: 'SOPO',
    direccion: '',
    elaboro: '',
    sistema: '',
    rasante: '',
    estadoPozo: 'Sin represamiento',
    gps: { lat: null, lng: null, precision: null },
    diam: 0.9,
    altura: 2.0,
    pendiente: '',
    camara: '',
    tapa: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
    cargue: { existe: 'DESCONOCIDO', mat: 'CONCRETO', estado: 'desconocido' },
    cuerpo: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
    cono: { existe: 'DESCONOCIDO', tipo: '', mat: '', estado: 'desconocido' },
    canu: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
    peld: { existe: 'DESCONOCIDO', mat: '', num: 0, estado: 'desconocido' },
    pipes: [],
    sums: [],
    photos: { general: [], interior: [], danos: [], esquemaVertical: [], ubGeneral: [] },
    fotoList: [],
    obs: '',
    reviso: '',
    aprobo: '',
    createdAt: null,
    id: null,
    zRasante: 2600.00,
    synced: false,
    cilindro: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
    placaBase: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
    notas: '',
    tipoCamara: '',
    sumideros: [],
    diametro: 0.9,
    contingencia: false,
    contingenciaMotivo: '',
    deleted: false,
};

export const MUNICIPIOS = [
    'AGUA DE DIOS',
    'ANOLAIMA',
    'QUIPILE',
    'SAN ANTONIO DEL TEQUENDAMA',
    'CACHIPAY - SAN MATEO',
    'CACHIPAY - PENA NEGRA',
    'RICAURTE',
    'ANAPOIMA',
    'SOPO',
    'SIBATE',
    'GRANADA',
    'MARINILLA'
];
export const SISTEMAS = ['PLUVIAL', 'RESIDUAL', 'COMBINADO', 'OCULTO', 'DESCONOCIDO'];
export const RASANTES = ['AFIRMADO', 'PAV_FLEX', 'PAV_RIG', 'PAV_ART', 'ZONA_VERDE', 'ANDEN', 'DESCONOCIDO', 'OTRO'];
export const ESTADOS_POZO = ['Sin represamiento', 'Inundado', 'Sellado', 'Colmatado', 'Oculto', 'OTRO'];
export const TIPOS_CAMARA = [
    'TIPICA_FONDO', 'DE_CAIDA', 'CON_COLCHON', 'ALV_SIMPLE', 'ALV_DOBLE',
    'ALV_SALTO', 'ALV_BARRERA', 'ALV_LAT_DOBLE', 'ALV_LAT_SENCILLO',
    'ALV_ORIFICIO', 'DESCONOCIDO', 'NO_APLICA', 'OTRO'
];
