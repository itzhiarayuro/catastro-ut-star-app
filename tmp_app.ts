interface AppState {
    pozo: string;
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
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */

const MUNICIPIOS = ['Sopó', 'Sibaté', 'Granada', 'Marinilla'];
const SISTEMAS = ['PLUVIAL', 'RESIDUAL', 'COMBINADO', 'OCULTO', 'DESCONOCIDO'];
const RASANTES = ['AFIRMADO', 'PAV_FLEX', 'PAV_RIG', 'PAV_ART', 'ZONA_VERDE', 'ANDEN', 'DESCONOCIDO', 'OTRO'];
const ESTADOS_POZO = ['Sin represamiento', 'Inundado', 'Sellado', 'Colmatado', 'Oculto'];
const TIPOS_CAMARA = [
    'TIPICA_FONDO', 'DE_CAIDA', 'CON_COLCHON', 'ALV_SIMPLE', 'ALV_DOBLE',
    'ALV_SALTO', 'ALV_BARRERA', 'ALV_LAT_DOBLE', 'ALV_LAT_SENCILLO',
    'ALV_ORIFICIO', 'DESCONOCIDO', 'NO_APLICA', 'OTRO'
];
const POZO_PREFIX = 'P';

/** Limpia valor "0" o "0.00" al enfocar un input numérico */
const numFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '0' || v === '0.00' || v === '0.0' || v === '0.9' || v === '2' || v === '2.0' || v === '2600' || v === '2600.00') {
        e.target.select();
    }
};

/** Normaliza ceros a la izquierda en un string numérico */
const normalizeNum = (val: string): string => {
    if (!val) return val;
    // Permitir decimales
    const num = parseFloat(val);
    if (isNaN(num)) return '0';
    return String(num);
};

const INITIAL_STATE: AppState = {
    pozo: '',
    fecha: new Date().toISOString().split('T')[0],
    barrio: '',
    municipio: 'Sopó',
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
    contingencia: false,
    contingenciaMotivo: '',
    deleted: false,
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

const MODAL_STYLES = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes zoomIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
    .animate-zoomIn { animation: zoomIn 0.2s ease-out forwards; }
    
    .spinner-white {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const App: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            console.log('SW Registered: ', r);
        },
        onRegisterError(error: any) {
            console.error('SW registration error', error);
        },
    });

    const { user, loading: authLoading, isAuthorized, logout } = useAuth();
    const [state, setState] = useState<AppState>(() => {