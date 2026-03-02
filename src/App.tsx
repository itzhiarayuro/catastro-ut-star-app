import React, { useState, useEffect, useRef } from 'react';
import { db, useFirestoreDoc, useAuth } from './lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LoginPage from './components/LoginPage';
import {
    Home, List, MapPin, Settings as SettingsIcon,
    ChevronLeft, ChevronRight, Check, Plus, Trash2,
    Wifi, WifiOff, Save, FileJson, FileText, Download,
    Cloud, Globe, Lightbulb, AlertTriangle, Info, Camera,
    RefreshCw, LogOut, Moon, Navigation, Search, Flag
} from 'lucide-react';
import { FotoRegistro } from './utils/fotoProcessor';
import FotosZone from './components/FotosZone';
import SyncScreen from './components/SyncScreen';
import MapasScreen from './components/MapasScreen';
import GeoTracker from './components/GeoTracker';
import MarcacionScreen from './components/MarcacionScreen';
import { getPendingPhotosCount, checkPendingInList, renamePhotoInStorage } from './utils/storageManager';
import { Crosshair, LocateFixed, Signal } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useRegisterSW } from 'virtual:pwa-register/react';

const APP_VERSION = '1.0.1';

/* ═══════════════════════════════════════════════════════════
   TYPES & INTERFACES
═══════════════════════════════════════════════════════════ */

interface GPSData {
    lat: number | null;
    lng: number | null;
    precision: number | null;
}

interface ComponentState {
    existe: string;
    mat: string;
    estado: string;
    tipo?: string;
    num?: number;
}

interface Pipe {
    id: string;
    es: 'ENTRADA' | 'SALIDA';
    deA: string;
    diam: string;
    mat: string;
    estado: string;
    cotaZ: string;
    pendiente: string;
    emboq: string;
    unit?: 'mm' | 'in';
}

interface Sumidero {
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
}

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
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */

const MUNICIPIOS = ['Sopó', 'Sibaté', 'Granada'];
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
    cargue: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
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

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

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
        try {
            const draft = localStorage.getItem('catastro_draft');
            if (draft) {
                const parsed = JSON.parse(draft);
                // Si el borrador tiene ID, es válido para cargarlo
                if (parsed && (parsed.id || parsed.pozo)) return parsed;
            }
        } catch (e) {
            console.error("Error loading draft from localStorage", e);
        }
        return INITIAL_STATE;
    });

    const [activeScreen, setActiveScreen] = useState<'sActivity' | 's0' | 'sFichas' | 'sConfig' | 'sForm' | 'sMaps' | 'sMarcacion'>(() => {
        const saved = localStorage.getItem('catastro_active_screen');
        // Validamos que si volvemos a un formulario, realmente haya datos
        if (saved === 'sForm') {
            const draft = localStorage.getItem('catastro_draft');
            if (!draft) return 'sActivity';
        }
        return (saved as any) || 'sActivity';
    });

    const [currentStep, setCurrentStep] = useState(() => {
        const saved = localStorage.getItem('catastro_current_step');
        return saved ? parseInt(saved) : 1;
    });
    const [fichas, setFichas] = useState<Record<string, AppState>>({});
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [toastMsg, setToastMsg] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [showSyncScreen, setShowSyncScreen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showGeoTracker, setShowGeoTracker] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutConfirmText, setLogoutConfirmText] = useState('');
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

    // Persistencia de navegación activa
    useEffect(() => {
        localStorage.setItem('catastro_active_screen', activeScreen);
    }, [activeScreen]);

    useEffect(() => {
        localStorage.setItem('catastro_current_step', currentStep.toString());
    }, [currentStep]);

    // Global Municipality for storage manager
    useEffect(() => {
        (window as any).CURRENT_MUNICIPIO = state.municipio;
    }, [state.municipio]);

    // Check pending photos for indicator
    useEffect(() => {
        const checkPending = async () => {
            const count = await getPendingPhotosCount();
            setPendingCount(count);
        };
        const interval = setInterval(checkPending, 30000); // Check every 30s
        checkPending();
        return () => clearInterval(interval);
    }, []);

    const firestorePath = state.pozo && state.municipio
        ? `fichas/${state.municipio.toUpperCase()}_${state.pozo.replace(/\s+/g, '')}`
        : '';

    const { saveData, loading } = useFirestoreDoc(firestorePath);

    // Dynamic Imports for Exports
    const handlePDF = async () => {
        // Deshabilitado temporalmente para integración con API externa
        alert("🛠️ Generación de PDF deshabilitada. Estamos integrando este botón con tu nueva API externa.");
    };

    const handleExcel = async () => {
        const { exportToExcel } = await import('./utils/export');
        exportToExcel(Object.values(fichas));
        toast("📊 Excel Generado");
    };

    const restoreFromCloud = async () => {
        if (!navigator.onLine) {
            toast("❌ Necesitas conexión para restaurar");
            return;
        }
        if (!confirm("⚠️ Esto sobrescribirá tus fichas locales con las descargas de la nube. ¿Continuar?")) return;

        toast("🔄 Descargando desde la nube...");
        try {
            const operatorId = user?.name || state.elaboro;
            if (!operatorId) {
                toast("❌ No se encontró nombre de operario para buscar");
                return;
            }
            const q = query(collection(db, 'fichas'), where('elaboro', '==', operatorId));
            const snapshot = await getDocs(q);
            const recovered: Record<string, AppState> = {};
            snapshot.forEach(doc => {
                const data = doc.data() as AppState;
                recovered[doc.id] = { ...data, synced: true };
            });
            if (Object.keys(recovered).length === 0) {
                toast("ℹ️ No se encontraron fichas tuyas en la nube");
                return;
            }
            setFichas(recovered);
            localStorage.setItem('fichas_star', JSON.stringify(recovered));
            toast(`✅ Restauradas ${Object.keys(recovered).length} fichas asignadas a ti`);
        } catch (error) {
            console.error("Error restoring from cloud", error);
            toast("❌ Error al restaurar desde la nube");
        }
    };

    // Load fichas from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('fichas_star');
        if (saved) {
            try {
                setFichas(JSON.parse(saved));
            } catch (e) {
                console.error("Error parsing fichas", e);
            }
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /* ═════════════════════════════════════
       MOTOR DE REGLAS (Rules Engine)
       ═════════════════════════════════════ */
    useEffect(() => {
        let newState = { ...state };
        let changed = false;

        // 1. Prioridad: OCULTO -> TODO bloqueado Desconocido
        if (state.sistema === 'OCULTO') {
            if (state.camara !== 'DESCONOCIDO') { newState.camara = 'DESCONOCIDO'; changed = true; }
            const fields: (keyof AppState)[] = ['tapa', 'cargue', 'cuerpo', 'cono', 'canu', 'peld'];
            fields.forEach(f => {
                if ((state[f] as any).existe !== 'DESCONOCIDO') {
                    (newState[f] as any) = { ...(state[f] as any), existe: 'DESCONOCIDO', estado: 'desconocido' };
                    changed = true;
                }
            });
        }

        // 2. SELLADO -> Sistema/Tipo Cam bloqueado
        if (state.estadoPozo === 'Sellado') {
            if (state.sistema !== 'DESCONOCIDO') { newState.sistema = 'DESCONOCIDO'; changed = true; }
            if (state.camara !== 'DESCONOCIDO') { newState.camara = 'DESCONOCIDO'; changed = true; }
        }

        // 3. COLMATADO -> Cañuela bloqueada
        if (state.estadoPozo === 'Colmatado') {
            if (state.canu.existe !== 'DESCONOCIDO') { newState.canu = { ...state.canu, existe: 'DESCONOCIDO' }; changed = true; }
        }

        // 4. INUNDADO -> Tapa NO Desconocido
        if (state.estadoPozo === 'Inundado') {
            if (state.tapa.existe === 'DESCONOCIDO') { newState.tapa.existe = 'SI'; changed = true; }
        }

        // 5. SIN REPRES -> NO Desconocido campos (sugerencia de integridad)
        if (state.estadoPozo === 'Sin represamiento') {
            // Logic to encourage known values (usually handled by UI hints)
        }

        // 6. SISTEMA DESCONOCIDO -> Tipo Cam/Cañuela bloqueado
        if (state.sistema === 'DESCONOCIDO' && state.estadoPozo !== 'Inundado') {
            if (state.camara !== 'DESCONOCIDO') { newState.camara = 'DESCONOCIDO'; changed = true; }
            if (state.canu.existe !== 'DESCONOCIDO') { newState.canu.existe = 'DESCONOCIDO'; changed = true; }
        }

        // 7. RASANTE DESCONOCIDO -> Relacionados bloqueado
        if (state.rasante === 'DESCONOCIDO') {
            if (state.tapa.existe !== 'DESCONOCIDO') { newState.tapa.existe = 'DESCONOCIDO'; changed = true; }
        }

        // 8. TIPO CAM DESCONOCIDO -> Solo habilitado exterior
        if (state.camara === 'DESCONOCIDO') {
            if (state.canu.existe !== 'DESCONOCIDO') { newState.canu.existe = 'DESCONOCIDO'; changed = true; }
        }

        if (changed) {
            setState(newState);
        }
    }, [state.sistema, state.estadoPozo, state.rasante, state.camara]);

    // Reactive Photo Renaming Effect
    useEffect(() => {
        const newIdPozo = (state.pozo || 'S/N').toUpperCase();

        // Verificamos si hay fotos que necesiten renombrarse
        const needsRename = state.fotoList.some(f => f.idPozo !== newIdPozo);

        if (needsRename) {
            console.log(`Renombrando fotos para el nuevo Pozo: ${newIdPozo}`);

            const updatedList = state.fotoList.map(foto => {
                if (foto.idPozo !== newIdPozo) {
                    const oldPrefix = foto.idPozo;
                    // El nuevo nombre mantiene el sufijo (ej: -P.JPG, -E1-T.JPG)
                    const newFilename = foto.filename.replace(new RegExp(`^${oldPrefix}`, 'i'), newIdPozo);

                    // Actualizar en IndexedDB de forma asíncrona
                    renamePhotoInStorage(foto.id, newIdPozo, newFilename).catch(err =>
                        console.error(`Error renombrando foto ${foto.id} en DB:`, err)
                    );

                    return { ...foto, idPozo: newIdPozo, filename: newFilename };
                }
                return foto;
            });

            setState(prev => ({ ...prev, fotoList: updatedList }));
        }
    }, [state.pozo]);

    /* ═════════════════════════════════════
       HELPERS
    ═════════════════════════════════════ */

    const toast = (msg: string) => {
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const updateState = (updates: Partial<AppState>) => {
        setState(prev => {
            const next = { ...prev, ...updates };
            localStorage.setItem('catastro_draft', JSON.stringify(next));
            return next;
        });

        // Auto-save logic
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            toast("✓ Borrador guardado");
        }, 1500);
    };

    const startNewFicha = () => {
        // If a draft already exists, ask the user before overwriting it.
        const existingDraft = localStorage.getItem('catastro_draft');
        if (existingDraft) {
            const draftObj = JSON.parse(existingDraft);
            // Only warn if the draft has some progress (id or pozo)
            if (draftObj.id || draftObj.pozo) {
                const ok = window.confirm(
                    `Hay un borrador guardado (Pozo: ${draftObj.pozo || 'S/N'}). Crear una nueva ficha lo sobrescribirá. ¿Continuar?`
                );
                if (!ok) return;
            }
        }
        const id = `F_${Date.now()}`;
        const newState = { ...INITIAL_STATE, id, createdAt: new Date().toISOString() };
        setState(newState);
        localStorage.setItem('catastro_draft', JSON.stringify(newState));
        setCurrentStep(1);
        setActiveScreen('sForm');
    };

    const continueDraft = () => {
        const draft = localStorage.getItem('catastro_draft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setState(parsed);
                setActiveScreen('sForm');
                // Intentamos volver al paso donde estaba, o al 1 por defecto
                const savedStep = localStorage.getItem('catastro_current_step');
                setCurrentStep(savedStep ? parseInt(savedStep) : 1);
                toast("📂 Borrador restaurado");
            } catch (e) {
                toast("❌ Error al cargar borrador");
            }
        }
    };

    const handleEditFromMap = (fichaData: any) => {
        // Asegurar que state reciba todos los campos requeridos mezclando con INITIAL_STATE
        const safeData = { ...INITIAL_STATE, ...fichaData };
        setState(safeData);
        localStorage.setItem('catastro_draft', JSON.stringify(safeData));
        setActiveScreen('sForm');
        setCurrentStep(1);
        toast("✏️ Editando Ficha de Mapa...");
    };

    const saveFicha = async () => {
        const id = state.id || `F_${Date.now()}`;
        const now = new Date().toISOString();
        const finalData = { ...state, id, savedAt: now, synced: false };

        // FIRST: Always save locally (Emergency Save / Auto-Draft)
        const updatedFichas = { ...fichas, [id]: finalData };
        setFichas(updatedFichas);
        localStorage.setItem('fichas_star', JSON.stringify(updatedFichas));
        // localStorage.removeItem('catastro_draft'); // Keep draft after saving so it survives page reloads

        // VALIDATION CHECK
        const missingFields: string[] = [];
        if (!state.pozo) missingFields.push("Pozo No.");
        if (!state.estadoPozo) missingFields.push("Estado Pozo");
        if (!state.sistema) missingFields.push("Sistema");
        if (!state.municipio) missingFields.push("Municipio");
        if (!state.barrio) missingFields.push("Barrio");
        if (!state.direccion) missingFields.push("Dirección");
        if (!state.elaboro) missingFields.push("Inspector");
        if (!state.rasante) missingFields.push("Rasante");
        if (!state.camara) missingFields.push("Tipo Cámara");

        // Pipes & Sums validation
        state.pipes.forEach((p, i) => {
            if (!p.deA || !p.diam || p.diam === '0' || !p.mat || !p.estado || !p.emboq) {
                missingFields.push(`Tubería #${i + 1} (incompleta)`);
            }
        });
        state.sums.forEach((s, i) => {
            if (!s.tipo || !s.estado || !s.matRejilla || !s.matCaja || !s.diamTub || s.diamTub === '0' || !s.matTub) {
                missingFields.push(`Sumidero #${i + 1} (incompleto)`);
            }
        });

        if (missingFields.length > 0) {
            toast(`📁 Guardado como Borrador. Pendiente: ${missingFields[0]}...`);
            // We DON'T return, we stay in the form so they can fix it, but now it's in the list!
            setActiveScreen('sFichas');
            return;
        }

        // Save to Firestore if online
        if (isOnline) {
            try {
                await saveData(finalData);
                const completeSynced = { ...finalData, synced: true };
                const finalFichas = { ...updatedFichas, [id]: completeSynced };
                setFichas(finalFichas);
                localStorage.setItem('fichas_star', JSON.stringify(finalFichas));
                toast("✅ Sincronizado en Nube");
            } catch (e) {
                toast("⚠️ Error Nube, guardado local");
            }
        } else {
            toast("✅ Guardado local (Offline)");
        }
        setActiveScreen('sFichas');
    };

    const deleteFicha = (id: string) => {
        setDeleteId(id);
        setDeleteConfirmText('');
    };

    const confirmDelete = () => {
        if (deleteConfirmText.toUpperCase() !== 'ELIMINAR') {
            toast("❌ Escribe ELIMINAR para confirmar");
            return;
        }

        const fichaToDelete = fichas[deleteId!];

        const updated = { ...fichas };

        // Soft Delete: en lugar de borrar la clave, simplemente marcamos como deleted. 
        // Force sync a false para reenviar a Firestore y dejar la traza.
        updated[deleteId!] = {
            ...fichaToDelete,
            deleted: true,
            synced: false
        };

        setFichas(updated);
        localStorage.setItem('fichas_star', JSON.stringify(updated));
        setDeleteId(null);
        toast("🗑 Ficha movida a papelera (Soft Delete)");
    };

    const captureGPS = () => {
        if (!navigator.geolocation) return toast("❌ GPS no soportado");
        toast("📍 Capturando GPS...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                updateState({
                    gps: {
                        lat: parseFloat(pos.coords.latitude.toFixed(7)),
                        lng: parseFloat(pos.coords.longitude.toFixed(7)),
                        precision: parseFloat(pos.coords.accuracy.toFixed(1))
                    }
                });
                toast("✅ GPS Capturado (Alta Precisión)");
            },
            (err) => {
                // Mock fallback for Sopó
                const lat = (4.908 + (Math.random() - 0.5) * 0.001).toFixed(7);
                const lng = (-73.948 + (Math.random() - 0.5) * 0.001).toFixed(7);
                updateState({ gps: { lat: parseFloat(lat), lng: parseFloat(lng), precision: 5.4 } });
                toast("📍 GPS Simulado (Sopó)");
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    /* ═════════════════════════════════════
       RENDER LOGIC
    ═════════════════════════════════════ */

    const renderActivitySelect = () => (
        <div id="sActivity" className={`screen ${activeScreen === 'sActivity' ? 'active' : ''}`} style={{ background: 'radial-gradient(circle at top right, #0f172a, #020617)' }}>
            <div className="home-center" style={{ padding: '40px 20px' }}>
                <div className="home-logo-container" style={{ margin: '0 auto 24px' }}>
                    <img src="/logo-ut-star.png" alt="UT STAR Logo" className="home-logo-img" />
                </div>

                <h2 className="text-white text-xl font-bold mb-2">Selección de Actividad</h2>
                <p className="text-gray-400 text-xs mb-8">Selecciona el módulo para iniciar el trabajo de hoy</p>

                <div className="grid gap-4 w-full">
                    <button
                        className="activity-card group"
                        onClick={() => setActiveScreen('s0')}
                        style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '24px',
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            transition: '0.3s'
                        }}
                    >
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '16px', borderRadius: '18px', color: 'white' }}>
                            <Search size={28} />
                        </div>
                        <div>
                            <div className="text-white font-bold text-lg">Actividad Investigación</div>
                            <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">Catastro & Alcantarillado</div>
                        </div>
                        <ChevronRight className="ml-auto text-gray-600 group-hover:text-white transition-colors" />
                    </button>

                    <button
                        className="activity-card group"
                        onClick={() => setActiveScreen('sMarcacion')}
                        style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '24px',
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            transition: '0.3s'
                        }}
                    >
                        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '16px', borderRadius: '18px', color: 'white' }}>
                            <Flag size={28} />
                        </div>
                        <div>
                            <div className="text-white font-bold text-lg">Actividad Marcación</div>
                            <div className="text-amber-400 text-[10px] font-black uppercase tracking-widest mt-1">Georreferenciación en Campo</div>
                        </div>
                        <ChevronRight className="ml-auto text-gray-600 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="mt-12 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                    Operario: {user?.name}
                </div>
            </div>

            <style>{`
                .activity-card:active { transform: scale(0.98); background: rgba(30, 41, 59, 0.8) !important; }
                .activity-card:hover { border-color: rgba(255, 255, 255, 0.3) !important; }
            `}</style>
        </div>
    );

    const renderMarcacionPlaceholder = () => (
        <div id="sMarcacion" className={`screen ${activeScreen === 'sMarcacion' ? 'active' : ''}`}>
            <div className="app-header">
                <div className="header-inner">
                    <button onClick={() => setActiveScreen('sActivity')} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Actividad Marcación</div>
                        <div className="header-sub">Georreferenciación</div>
                    </div>
                </div>
            </div>
            <div className="content flex flex-col items-center justify-center text-center p-12">
                <div className="bg-amber-500/10 p-6 rounded-full mb-6">
                    <Flag size={48} className="text-amber-500 animate-bounce" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Módulo de Marcación</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Estamos preparando este módulo para la georreferenciación rápida de puntos.
                    Por ahora, utiliza el módulo de **Investigación** para el catastro completo.
                </p>
                <button className="btn btn-blue mt-8 px-8" onClick={() => setActiveScreen('sActivity')}>
                    Volver a Selección
                </button>
            </div>
        </div>
    );

    const renderHome = () => {
        const fichasArr = Object.values(fichas).filter(f => !f.deleted);
        const totalFichas = fichasArr.length;
        const pendingFichas = fichasArr.filter(f => !f.synced).length;
        const syncedFichas = totalFichas - pendingFichas;

        return (
            <div id="s0" className={`screen ${activeScreen === 's0' ? 'active' : ''}`}>
                <div className="home-center">
                    <div className="home-logo-container">
                        <img src="/logo-ut-star.png" alt="UT STAR Logo" className="home-logo-img" />
                    </div>
                    <div>
                        <div className="home-title">Ficha <span>Catastro</span><br />Alcantarillado</div>
                    </div>

                    {/* Sync Summary Card */}
                    <div className="sync-summary-card">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Resumen de Hoy</span>
                            <div className={`flex items-center gap-1 text-[9px] font-bold ${isOnline ? 'text-green-500' : 'text-amber-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                {isOnline ? 'CONECTADO' : 'MODO OFFLINE'}
                            </div>
                        </div>
                        <div className="sync-grid">
                            <div className="sync-stat synced">
                                <label>Fichas en Nube</label>
                                <div className="sync-stat-val">{syncedFichas}<span>{totalFichas} total</span></div>
                            </div>
                            <div className="sync-stat pending">
                                <label>Fotos Pendientes</label>
                                <div className="sync-stat-val">{pendingCount}<span>cola Drive</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="home-badge">
                        <span className="dot"></span>
                        UT STAR · Municipio {state.municipio}
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {state.id && (
                            <button className="btn btn-yellow btn-full py-4 text-sm" onClick={continueDraft} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}>
                                <Save size={18} />
                                Continuar Borrador ({state.pozo || 'Sin Nombre'})
                            </button>
                        )}

                        <button className="btn btn-green btn-full py-4 text-sm" onClick={startNewFicha}>
                            <Plus size={18} strokeWidth={3} />
                            Nueva Inspección
                        </button>

                        {(pendingCount > 0 || pendingFichas > 0) && (
                            <button className="btn btn-blue btn-full relative py-4 group overflow-hidden" onClick={() => setShowSyncScreen(true)} style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none' }}>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                                <Cloud size={16} className="z-10" />
                                <span className="z-10">Sincronización Nocturna</span>
                                <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#020617] font-black z-20">
                                    {pendingCount + pendingFichas}
                                </span>
                            </button>
                        )}

                        <button className="btn btn-ghost btn-full" onClick={() => setActiveScreen('sFichas')}>
                            <List size={16} />
                            Historial de Fichas
                        </button>

                        <button className="btn btn-ghost btn-full mt-4" onClick={() => setActiveScreen('sActivity')} style={{ border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b' }}>
                            <SettingsIcon size={14} />
                            Cambiar a Marcación / Selección
                        </button>
                    </div>

                    <div className="mt-6 opacity-30 text-[9px] uppercase tracking-widest font-bold">
                        PDA-C-570-2025 · UT STAR
                    </div>
                </div>
            </div>
        );
    };

    const renderFichas = () => {
        const list = Object.values(fichas).filter(f => !f.deleted).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        return (
            <div id="sFichas" className={`screen ${activeScreen === 'sFichas' ? 'active' : ''}`}>
                <div className="app-header">
                    <div className="header-inner">
                        <button onClick={() => setActiveScreen('s0')} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <div className="header-titles">
                            <div className="header-title">Fichas Guardadas</div>
                            <div className="header-sub">Sincronización {isOnline ? 'Activa' : 'Offline'}</div>
                        </div>
                    </div>
                </div>
                <div className="content">
                    {list.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📂</div>
                            <p>No hay fichas guardadas aún.</p>
                        </div>
                    ) : (
                        list.map(f => (
                            <FichaItemRow
                                key={f.id}
                                f={f}
                                onEdit={() => {
                                    setState(f);
                                    localStorage.setItem('catastro_draft', JSON.stringify(f));
                                    setActiveScreen('sForm');
                                    setCurrentStep(1);
                                }}
                                onDelete={() => deleteFicha(f.id!)}
                            />
                        ))
                    )}
                </div>

                {/* MODAL ELIMINAR */}
                {deleteId && (
                    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-[#1c2230] border border-[#2d3748] p-6 rounded-2xl w-full max-w-xs shadow-2xl text-center">
                            <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar Ficha?</h3>
                            <p className="text-gray-400 text-xs mb-6">Esta acción es permanente. Escribe <span className="text-white font-bold">ELIMINAR</span> para confirmar:</p>
                            <input
                                type="text"
                                className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center text-white font-bold uppercase mb-6"
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                placeholder="..."
                            />
                            <div className="flex gap-3">
                                <button className="btn btn-ghost flex-1 py-3" onClick={() => setDeleteId(null)}>Cancelar</button>
                                <button className="btn btn-danger flex-1 py-3" onClick={confirmDelete}>Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderConfig = () => (
        <div id="sConfig" className={`screen ${activeScreen === 'sConfig' ? 'active' : ''}`}>
            <div className="app-header">
                <div className="header-inner">
                    <button onClick={() => setActiveScreen('s0')} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Configuración</div>
                        <div className="header-sub">UT STAR · V2.0</div>
                    </div>
                </div>
            </div>
            <div className="content">
                <div className="card">
                    <div className="card-title">Municipio de Trabajo</div>
                    <div className="chips">
                        {MUNICIPIOS.map(m => (
                            <div
                                key={m}
                                className={`chip ${state.municipio === m ? 'selected' : ''}`}
                                onClick={() => updateState({ municipio: m })}
                            >
                                {m}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card">
                    <div className="card-title">Estado del Sistema</div>
                    <div className="flex flex-col gap-3 text-xs">
                        <div className={`p-2 rounded-lg flex items-center gap-2 ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                            {isOnline ? 'CONEXIÓN ESTABLE' : 'MODO OFFLINE'}
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                            <div className="text-gray-400">Total fichas locales:</div>
                            <div className="font-bold text-white">{Object.keys(fichas).length} fichas</div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                            <div className="text-gray-400">Fotos en cola local:</div>
                            <div className="font-bold text-amber-400">{pendingCount} fotos <span className="text-[10px] text-gray-500 ml-1">(~{(pendingCount * 1.2).toFixed(1)} MB)</span></div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginTop: '20px', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                    <div className="card-title" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cloud size={16} /> Recuperación (Backup)
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: '1.4', marginBottom: '12px' }}>
                        Si perdiste tus datos locales por problemas de memoria del navegador o si cambiaste de celular, puedes descargar nuevamente las fichas que ya subiste a la nube.
                    </p>
                    <button className="btn btn-blue btn-full" onClick={restoreFromCloud}>
                        <RefreshCw size={16} /> Descargar fichas asignadas a mí
                    </button>
                </div>

                <button
                    className="btn btn-danger btn-full"
                    onClick={() => { if (confirm("¿Borrar todo?")) { localStorage.removeItem('fichas_star'); setFichas({}); toast("🗑 Memoria limpiada"); } }}
                    style={{ marginBottom: '12px' }}
                >
                    <Trash2 size={16} /> Limpiar Base de Datos Local
                </button>

                <div className="card" style={{ marginTop: '20px', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
                    <div className="card-title" style={{ color: '#ef4444' }}>Sesión de Usuario</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{user?.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{user?.email}</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-full" onClick={() => { setLogoutConfirmText(''); setShowLogoutModal(true); }}>
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>

                <div style={{ textAlign: 'center', padding: '20px', opacity: 0.3 }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '2px' }}>UT STAR Catastro v{APP_VERSION}</div>
                    <div style={{ fontSize: '7px', marginTop: '4px' }}>© 2026 • SOPÓ, COLOMBIA</div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ background: 'none', border: 'none', color: 'inherit', fontSize: '8px', textDecoration: 'underline', marginTop: '10px', cursor: 'pointer' }}
                    >
                        Forzar recarga de sistema
                    </button>
                </div>
            </div>

        </div>
    );

    /* ═════════════════════════════════════
       FORM STEPS
    ═════════════════════════════════════ */

    const renderForm = () => {
        const steps = [
            'Identificación', 'Geometría', 'Componentes', 'Tuberías', 'Fotos', 'Resumen'
        ];
        const stepTitle = steps[currentStep - 1];

        return (
            <div id="sForm" className={`screen ${activeScreen === 'sForm' ? 'active' : ''}`}>
                <div className="app-header">
                    <div className="header-inner">
                        <button onClick={() => { if (confirm("¿Salir?")) setActiveScreen('s0'); }} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <div className="header-titles" style={{ textAlign: 'center' }}>
                            <div className="header-title" style={{ fontSize: '12px' }}>{stepTitle}</div>
                            <div className="header-sub" style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold' }}>
                                Paso {currentStep} de 5 • <span style={{ color: 'var(--blue)' }}>{state.municipio}</span>
                            </div>
                        </div>
                        {loading && <RefreshCw size={14} className="animate-spin text-blue-500" />}
                    </div>
                </div>

                {currentStep <= 5 && (
                    <>
                        <div className="progress-wrap">
                            <div className="progress-bar-track">
                                <div className="progress-bar-fill" style={{ width: `${(currentStep / 5) * 100}%` }}></div>
                            </div>
                            <div className="progress-label">
                                <span>{stepTitle}</span>
                                <span className="progress-step">{Math.round((currentStep / 5) * 100)}%</span>
                            </div>
                        </div>

                        <div className="step-chips">
                            {['ID', 'POZO', 'COMP', 'TUB', 'FOT'].map((s, i) => (
                                <div
                                    key={s}
                                    className={`step-chip ${currentStep === i + 1 ? 'active' : ''} ${currentStep > i + 1 ? 'done' : ''}`}
                                    onClick={() => setCurrentStep(i + 1)}
                                >
                                    {i + 1}·{s}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className="content">
                    {currentStep === 1 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="card">
                                <div className="card-title">Identificación del Pozo</div>
                                <div className="field-row">
                                    <div className="field">
                                        <label>Pozo No.* <span style={{ fontSize: '9px', color: '#64748b' }}>(Prefijo {POZO_PREFIX} automático)</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', fontWeight: 'bold', fontSize: '14px', fontFamily: 'DM Mono', pointerEvents: 'none' }}>{POZO_PREFIX}</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={state.pozo.startsWith(POZO_PREFIX) ? state.pozo.slice(POZO_PREFIX.length) : state.pozo}
                                                onChange={e => {
                                                    const num = e.target.value.replace(/[^0-9]/g, '');
                                                    updateState({ pozo: num ? POZO_PREFIX + num : '' });
                                                }}
                                                placeholder="001"
                                                style={{ paddingLeft: '28px' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label>Fecha</label>
                                        <input type="date" value={state.fecha} onChange={e => updateState({ fecha: e.target.value })} />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>Estado Pozo</label>
                                    <select value={state.estadoPozo} onChange={e => updateState({ estadoPozo: e.target.value })}>
                                        {ESTADOS_POZO.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>

                                <div className="field">
                                    <label>Barrio*</label>
                                    <input type="text" value={state.barrio} onChange={e => updateState({ barrio: e.target.value })} placeholder="Ej: Centro" />
                                </div>
                                <div className="field">
                                    <label>Dirección*</label>
                                    <input type="text" value={state.direccion} onChange={e => updateState({ direccion: e.target.value })} placeholder="Ej: Cl 10 # 5-20" />
                                </div>
                                <div className="field">
                                    <label>Altura Total (H pozo) <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                                    <input type="number" step="0.01" value={state.altura}
                                        onFocus={numFocus}
                                        onChange={e => updateState({ altura: parseFloat(e.target.value) || 0 })}
                                        onBlur={e => { if (!e.target.value) updateState({ altura: 2.0 }); }}
                                        placeholder="2.00 m" />
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Sistema</div>
                                <div className="chips-big">
                                    {SISTEMAS.map(s => (
                                        <div
                                            key={s}
                                            className={`chip-big ${state.sistema === s ? 'selected' : ''}`}
                                            onClick={() => updateState({ sistema: s })}
                                        >
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Ubicación GPS</div>
                                <div className="gps-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-blue btn-full btn-sm" style={{ flex: 1 }} onClick={captureGPS}>
                                            <Navigation size={14} /> Capturar GPS
                                        </button>
                                        <button className="btn btn-blue btn-full btn-sm" style={{ flex: 1, backgroundColor: '#0066FF' }} onClick={() => setShowGeoTracker(true)}>
                                            <Crosshair size={14} /> Punto Exacto
                                        </button>
                                    </div>
                                    {state.gps.lat && (
                                        <>
                                            <div className="gps-result show" style={{ textAlign: 'left', padding: '12px' }}>
                                                <div className="gps-line" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <LocateFixed size={14} className={state.gps.precision && state.gps.precision <= 15 ? 'text-green-500' : 'text-amber-500'} />
                                                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>Lat: <strong>{state.gps.lat?.toFixed(7)}</strong> | Lng: <strong>{state.gps.lng?.toFixed(7)}</strong></span>
                                                </div>
                                                <div className="gps-line" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                    {state.gps.precision && state.gps.precision > 20 ? <AlertTriangle size={14} className="text-red-500" /> : <Signal size={14} className="text-green-500" />}
                                                    <span style={{ fontSize: '11px' }} className={state.gps.precision && state.gps.precision > 20 ? 'text-red-400 font-bold' : 'text-blue-400 opacity-80'}>
                                                        Precisión: {state.gps.precision?.toFixed(1)} m
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Mapa con JS API (Más robusto que iframe) */}
                                            <div style={{ width: '100%', height: '150px', borderRadius: '12px', overflow: 'hidden', marginTop: '10px', border: '1px solid #30363d' }}>
                                                <Map
                                                    style={{ width: '100%', height: '100%' }}
                                                    center={{ lat: state.gps.lat || 0, lng: state.gps.lng || 0 }}
                                                    zoom={18}
                                                    gestureHandling={'none'}
                                                    disableDefaultUI={true}
                                                    mapTypeId="satellite"
                                                    mapId="bf19642642a561"
                                                >
                                                    <AdvancedMarker position={{ lat: state.gps.lat || 0, lng: state.gps.lng || 0 }}>
                                                        <div style={{ width: '24px', height: '34px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
                                                            <svg viewBox="0 0 30 42" width="24" height="34" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#0066FF" stroke="#ffffff" strokeWidth="2" />
                                                                <circle cx="15" cy="14" r="6" fill="#ffffff" opacity="0.9" />
                                                            </svg>
                                                        </div>
                                                    </AdvancedMarker>
                                                </Map>
                                            </div>

                                            <button
                                                className="btn btn-ghost btn-sm btn-full"
                                                onClick={() => window.open(`https://www.google.com/maps?q=${state.gps.lat},${state.gps.lng}`, '_blank')}
                                            >
                                                <Globe size={14} /> Ver en Full Google Maps
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="btn-row">
                                <button className="btn btn-green btn-full" onClick={() => {
                                    if (!state.pozo || !state.barrio || !state.direccion) {
                                        toast("⚠️ Por favor completa Pozo, Barrio y Dirección.");
                                        return;
                                    }
                                    setCurrentStep(2);
                                }}>Siguiente <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="card">
                                <div className="card-title">Dimensiones (m)</div>
                                <div className="well-diagram">
                                    <WellDiagram diam={state.diam} altura={state.altura} pipes={state.pipes} />
                                </div>
                                <div className="field-row">
                                    <div className="field">
                                        <label>Diámetro Cuerpo <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            value={state.diam}
                                            onFocus={numFocus}
                                            onChange={e => updateState({ diam: parseFloat(e.target.value) || 0 })}
                                            onBlur={e => { if (!e.target.value) updateState({ diam: 0.9 }); }}
                                            placeholder="0.90 m"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Altura Total <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            value={state.altura}
                                            onFocus={numFocus}
                                            onChange={e => updateState({ altura: parseFloat(e.target.value) || 0 })}
                                            onBlur={e => { if (!e.target.value) updateState({ altura: 1.2 }); }}
                                            placeholder="1.20 m"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Tipo de Cámara</div>
                                <div className="chips">
                                    {TIPOS_CAMARA.map(t => (
                                        <div key={t} className={`chip ${(state.camara === t && t !== 'OTRO') || (t === 'OTRO' && state.camara && !TIPOS_CAMARA.includes(state.camara)) || (state.camara === 'OTRO' && t === 'OTRO') ? 'selected' : ''}`} onClick={() => updateState({ camara: t })}>
                                            {t.replace(/_/g, ' ')}
                                        </div>
                                    ))}
                                </div>
                                {((state.camara && !TIPOS_CAMARA.includes(state.camara)) || state.camara === 'OTRO') && (
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={state.camara === 'OTRO' ? '' : state.camara}
                                        onChange={e => updateState({ camara: e.target.value.toUpperCase() })}
                                        placeholder="Especifique tipo de cámara..."
                                        style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                    />
                                )}
                            </div>

                            <div className="card">
                                <div className="card-title">Rasante</div>
                                <div className="chips">
                                    {RASANTES.map(r => (
                                        <div key={r} className={`chip ${(state.rasante === r && r !== 'OTRO') || (r === 'OTRO' && state.rasante && !RASANTES.includes(state.rasante)) || (state.rasante === 'OTRO' && r === 'OTRO') ? 'selected' : ''}`} onClick={() => updateState({ rasante: r })}>
                                            {r.replace(/_/g, ' ')}
                                        </div>
                                    ))}
                                </div>
                                {((state.rasante && !RASANTES.includes(state.rasante)) || state.rasante === 'OTRO') && (
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={state.rasante === 'OTRO' ? '' : state.rasante}
                                        onChange={e => updateState({ rasante: e.target.value.toUpperCase() })}
                                        placeholder="Especifique la rasante..."
                                        style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                    />
                                )}
                            </div>

                            <div className="card" style={{ background: state.contingencia ? 'rgba(255, 107, 53, 0.1)' : 'var(--bg3)', borderColor: state.contingencia ? 'var(--orange)' : 'var(--border)' }}>
                                <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>⚠️ Modo Contingencia</span>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={!!state.contingencia}
                                            onChange={(e) => updateState({ contingencia: e.target.checked, contingenciaMotivo: e.target.checked ? state.contingenciaMotivo : '' })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px', lineHeight: '1.4' }}>
                                    Habilita esto si es <strong>imposible</strong> medir el pozo (ej. está pavimentado/sellado). Levantará una bandera para revisión en oficina.
                                </p>
                                {state.contingencia && (
                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={state.contingenciaMotivo || ''}
                                        onChange={e => updateState({ contingenciaMotivo: e.target.value })}
                                        placeholder="Ej: Pozo sellado bajo pavimento profundo..."
                                        style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--orange)', background: '#1c1713', color: 'var(--text)' }}
                                    />
                                )}
                            </div>

                            <div className="btn-row">
                                <button className="btn btn-ghost" onClick={() => setCurrentStep(1)}><ChevronLeft size={16} /> Volver</button>
                                <button className="btn btn-green" onClick={() => {
                                    const isOtroCamara = (state.camara === 'OTRO' || (state.camara && !TIPOS_CAMARA.includes(state.camara)));
                                    const isOtroRasante = (state.rasante === 'OTRO' || (state.rasante && !RASANTES.includes(state.rasante)));

                                    if (state.contingencia) {
                                        if (!state.contingenciaMotivo || state.contingenciaMotivo.trim().length < 5) {
                                            toast("⚠️ Por favor, explica brevemente el motivo de la contingencia.");
                                            return;
                                        }
                                    } else {
                                        // Validaciones Normales
                                        if (!state.diam || state.diam <= 0 || !state.altura || state.altura <= 0) {
                                            toast("⚠️ El Diámetro y la Altura deben ser mayores a 0.");
                                            return;
                                        }
                                        if (!state.camara || (isOtroCamara && state.camara === 'OTRO')) {
                                            toast("⚠️ Selecciona o escribe un Tipo de Cámara.");
                                            return;
                                        }
                                        if (!state.rasante || (isOtroRasante && state.rasante === 'OTRO')) {
                                            toast("⚠️ Selecciona o escribe una Rasante.");
                                            return;
                                        }
                                    }
                                    setCurrentStep(3);
                                }}>Siguiente <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <ComponentEditor
                                label="Tapa"
                                data={state.tapa}
                                onChange={(v) => updateState({ tapa: { ...state.tapa, ...v } })}
                                materials={['CONCRETO', 'FERROCONCRETO', 'METAL', 'POLIPROPILENO', 'PVC', 'OTRO']}
                            />
                            <ComponentEditor
                                label="Cargue"
                                data={state.cargue}
                                onChange={(v) => updateState({ cargue: { ...state.cargue, ...v } })}
                                materials={['CONCRETO', 'FERROCONCRETO', 'METAL', 'POLIPROPILENO', 'PVC', 'OTRO']}
                            />
                            <ComponentEditor
                                label="Cuerpo"
                                data={state.cuerpo}
                                onChange={(v) => updateState({ cuerpo: { ...state.cuerpo, ...v } })}
                                materials={['MAMPOSTERIA', 'CONCRETO', 'PVC', 'GRP', 'OTRO']}
                            />
                            <ComponentEditor
                                label="Cono"
                                data={state.cono}
                                onChange={(v) => updateState({ cono: { ...state.cono, ...v } })}
                                materials={['CONCENTRICO', 'EXCENTRICO', 'OTRO']}
                                isCono
                            />
                            <ComponentEditor
                                label="Cañuela"
                                data={state.canu}
                                onChange={(v) => updateState({ canu: { ...state.canu, ...v } })}
                                materials={['MAMPOSTERIA', 'CONCRETO', 'PVC', 'OTRO']}
                            />
                            <ComponentEditor
                                label="Peldaños"
                                data={state.peld}
                                onChange={(v) => updateState({ peld: { ...state.peld, ...v } })}
                                materials={['METAL', 'POLIPROPILENO', 'NO_TIENE']}
                            />

                            <div className="btn-row">
                                <button className="btn btn-ghost" onClick={() => setCurrentStep(2)}><ChevronLeft size={16} /> Volver</button>
                                <button className="btn btn-green" onClick={() => setCurrentStep(4)}>Siguiente <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="card">
                                <div className="card-title">Tuberías (E1-7 / S1-2)</div>
                                <div className="space-y-4">
                                    {state.pipes.map((p, idx) => (
                                        <PipeCard
                                            key={p.id}
                                            pipe={p}
                                            index={idx}
                                            onUpdate={(upd) => {
                                                const newPipes = [...state.pipes];
                                                newPipes[idx] = { ...p, ...upd };
                                                updateState({ pipes: newPipes });
                                            }}
                                            onDelete={() => {
                                                updateState({ pipes: state.pipes.filter((_, i) => i !== idx) });
                                            }}
                                        />
                                    ))}
                                    <button className="btn btn-blue btn-full btn-sm" onClick={() => {
                                        const id = `P_${Date.now()}`;
                                        updateState({ pipes: [...state.pipes, { id, es: 'ENTRADA', deA: '', diam: '', mat: '', estado: '', cotaZ: '', pendiente: '', emboq: 'NO' }] });
                                    }}>
                                        <Plus size={14} /> Agregar Tubería
                                    </button>
                                </div>
                            </div>

                            <div className="card mt-4">
                                <div className="card-title">Sumideros (1-6)</div>
                                <div className="space-y-4">
                                    {state.sums.map((s, idx) => (
                                        <SumideroCard
                                            key={s.id}
                                            sum={s}
                                            index={idx}
                                            onUpdate={(upd) => {
                                                const newSums = [...state.sums];
                                                newSums[idx] = { ...s, ...upd };
                                                updateState({ sums: newSums });
                                            }}
                                            onDelete={() => {
                                                updateState({ sums: state.sums.filter((_, i) => i !== idx) });
                                            }}
                                        />
                                    ))}
                                    <button className="btn btn-orange btn-full btn-sm" onClick={() => {
                                        const id = `S_${Date.now()}`;
                                        updateState({ sums: [...state.sums, { id, tipo: '', matRejilla: '', matCaja: '', hSalida: '', hLlegada: '', estado: '', codEsquema: `S-${state.sums.length + 1}`, diamTub: '', matTub: '' }] });
                                    }}>
                                        <Plus size={14} /> Agregar Sumidero
                                    </button>
                                </div>
                            </div>

                            <div className="btn-row">
                                <button className="btn btn-ghost" onClick={() => setCurrentStep(3)}><ChevronLeft size={16} /> Volver</button>
                                <button className="btn btn-green" onClick={() => setCurrentStep(5)}>Siguiente <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="card">
                                <div className="card-title">Registro Fotográfico (Max 4/zona)</div>
                                <div className="card">
                                    <FotosZone
                                        pozoId={state.pozo || 'S/N'}
                                        photos={state.fotoList}
                                        pipes={state.pipes}
                                        sums={state.sums}
                                        onAddPhoto={(foto) => updateState({ fotoList: [...state.fotoList, foto] })}
                                        onDeletePhoto={(id) => updateState({ fotoList: state.fotoList.filter(f => f.id !== id) })}
                                    />
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Observaciones y Cierre</div>
                                <div className="field">
                                    <div className="flex justify-between items-end mb-1">
                                        <label className="mb-0">Observaciones</label>
                                        <button
                                            className="bg-white/5 hover:bg-white/10 text-[10px] py-1 px-2 rounded-md flex items-center gap-1 transition-all"
                                            onClick={() => {
                                                const bullet = "• ";
                                                updateState({ obs: state.obs + (state.obs.endsWith('\n') || state.obs === '' ? '' : '\n') + bullet });
                                            }}
                                        >
                                            <List size={12} /> Añadir Viñeta
                                        </button>
                                    </div>
                                    <textarea
                                        value={state.obs}
                                        onChange={e => updateState({ obs: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const lines = state.obs.split('\n');
                                                const lastLine = lines[lines.length - 1];
                                                if (lastLine.trim().startsWith('•')) {
                                                    // Continue bullet list if last line had one
                                                    e.preventDefault();
                                                    updateState({ obs: state.obs + '\n• ' });
                                                }
                                            }
                                        }}
                                        rows={6}
                                        placeholder="Ej: • Tapa fisurada..."
                                    />
                                </div>
                                <div className="field-row">
                                    <div className="field">
                                        <label>Revisó</label>
                                        <input type="text" value={state.reviso} onChange={e => updateState({ reviso: e.target.value })} />
                                    </div>
                                    <div className="field">
                                        <label>Aprobó</label>
                                        <input type="text" value={state.aprobo} onChange={e => updateState({ aprobo: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="btn-row">
                                <button className="btn btn-ghost" onClick={() => setCurrentStep(4)}><ChevronLeft size={16} /> Volver</button>
                                <button className="btn btn-green" onClick={() => setCurrentStep(6)}>Finalizar <Check size={16} /></button>
                            </div>
                        </div>
                    )}

                    {currentStep === 6 && (
                        <div className="animate-in zoom-in duration-500">
                            <div className="summary-check">
                                <div className="check-circle">
                                    <Check color="var(--green)" size={32} strokeWidth={3} />
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '20px', color: 'var(--green)' }}>¡Ficha Completa!</div>
                                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Pozo {state.pozo} · {state.barrio}</div>
                            </div>

                            <div className="summary-grid">
                                <SummaryItem label="Pozo No." val={state.pozo} />
                                <SummaryItem label="Estado" val={state.estadoPozo} />
                                <SummaryItem label="Sistema" val={state.sistema} />
                                <SummaryItem label="GPS" val={state.gps.lat ? `${state.gps.lat}, ${state.gps.lng}` : 'No'} />
                                <SummaryItem label="Altura Total" val={`${state.altura} m`} />
                                <SummaryItem label="Ø Cuerpo" val={`${state.diam} m`} />
                                <SummaryItem label="Tuberías" val={state.pipes.length.toString()} />
                                <SummaryItem label="Pendientes" val={state.pipes.some(p => p.pendiente) ? 'Registradas' : 'No'} />
                                <SummaryItem label="Fotos" val={state.fotoList.length.toString()} />
                            </div>

                            <div className="space-y-3 mt-6">
                                <div className="flex gap-3">
                                    <button className="btn btn-ghost flex-1 py-3" onClick={() => setCurrentStep(5)}>
                                        <ChevronLeft size={16} /> Volver
                                    </button>
                                    <button className="btn btn-green flex-[2] py-3" onClick={saveFicha}>
                                        <Save size={16} /> Finalizar y Guardar
                                    </button>
                                </div>
                                <button className="btn btn-blue btn-full" onClick={handleExcel}>
                                    <FileJson size={16} /> Exportar Reporte XLSX
                                </button>
                                <div className="btn-row">
                                    <button className="btn btn-yellow" onClick={handleExcel}><Download size={14} /> Excel Global</button>
                                    <button className="btn btn-orange" onClick={handlePDF}><FileText size={14} /> PDF Ficha</button>
                                </div>
                                <button className="btn btn-ghost btn-full" onClick={() => {
                                    if (isOnline) {
                                        saveFicha();
                                    } else {
                                        toast("⚠️ Modo Offline: No se pudo testear sync");
                                    }
                                }}>
                                    <RefreshCw size={16} /> Test Sync Cel2 (Forzar Nube)
                                </button>
                                <button className="btn btn-ghost btn-full" onClick={startNewFicha}>
                                    <Plus size={16} /> Nueva Ficha
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (authLoading) return (
        <div style={{ background: '#020617', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!user) return <LoginPage />;

    if (!isAuthorized) return (
        <div style={{ background: '#020617', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', padding: '20px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Acceso No Autorizado</h1>
            <p style={{ color: '#94a3b8', maxWidth: '300px' }}>El correo <strong>{user.email}</strong> no tiene permisos para acceder a este sistema.</p>
            <button className="btn btn-ghost mt-6" onClick={() => { setLogoutConfirmText(''); setShowLogoutModal(true); }} style={{ marginTop: '30px' }}>Cerrar Sesión</button>

            {/* Modal de Cierre de Sesión para no autorizados */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-[#1c2230] border border-[#2d3748] p-6 rounded-2xl w-full max-w-xs shadow-2xl text-center">
                        <LogOut size={40} className="text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Cerrar Sesión</h3>
                        <p className="text-gray-400 text-[11px] mb-6">Si cierras sesión sin internet no podrás volver a entrar. Escribe <span className="text-white font-bold">cerrar sesion</span> para confirmar:</p>
                        <input
                            type="text"
                            className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center text-white font-bold mb-6"
                            value={logoutConfirmText}
                            onChange={e => setLogoutConfirmText(e.target.value)}
                            placeholder="..."
                        />
                        <div className="flex gap-3">
                            <button className="btn btn-ghost flex-1 py-3" onClick={() => setShowLogoutModal(false)}>Cancelar</button>
                            <button
                                className="btn btn-danger flex-1 py-3"
                                onClick={() => {
                                    if (logoutConfirmText === 'cerrar sesion') {
                                        logout();
                                        setShowLogoutModal(false);
                                    } else {
                                        toast("❌ Escribe exactamente 'cerrar sesion'");
                                    }
                                }}
                            >
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <APIProvider apiKey={import.meta.env.VITE_FIREBASE_API_KEY} libraries={['marker']}>
            <div className="app-container">
                {/* PWA Update Prompt */}
                {(offlineReady || needRefresh) && (
                    <div style={{
                        position: 'fixed', bottom: '80px', left: '20px', right: '20px',
                        zIndex: 10000, background: '#1d4ed8', color: 'white',
                        padding: '16px', borderRadius: '16px', display: 'flex',
                        flexDirection: 'column', gap: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <RefreshCw size={20} className={needRefresh ? 'animate-spin' : ''} />
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                {needRefresh ? '🚀 ¡Nueva versión disponible!' : '✅ App lista para usar sin internet'}
                            </div>
                        </div>
                        {needRefresh && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button onClick={() => updateServiceWorker(true)} style={{ flex: 1, background: 'white', color: '#1d4ed8', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' }}>
                                    ACTUALIZAR AHORA
                                </button>
                                <button onClick={() => { setOfflineReady(false); setNeedRefresh(false); }} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '12px' }}>
                                    LUEGO
                                </button>
                            </div>
                        )}
                        {!needRefresh && (
                            <button onClick={() => { setOfflineReady(false); setNeedRefresh(false); }} style={{ background: 'white', color: '#1d4ed8', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', alignSelf: 'flex-end' }}>
                                ENTENDIDO
                            </button>
                        )}
                    </div>
                )}

                {activeScreen === 'sActivity' && renderActivitySelect()}
                {activeScreen === 'sMarcacion' && (
                    <MarcacionScreen
                        user={user}
                        onBack={() => setActiveScreen('sActivity')}
                        onSuccess={(msg) => toast(msg)}
                    />
                )}
                {activeScreen === 's0' && renderHome()}
                {activeScreen === 'sFichas' && renderFichas()}
                {activeScreen === 'sConfig' && renderConfig()}
                {activeScreen === 'sForm' && renderForm()}
                {activeScreen === 'sMaps' && <MapasScreen onEditFicha={handleEditFromMap} onBack={() => setActiveScreen('s0')} />}

                {showSyncScreen && (
                    <SyncScreen
                        fichas={fichas}
                        onFichasUpdated={(updated) => {
                            setFichas(updated);
                            localStorage.setItem('fichas_star', JSON.stringify(updated));
                        }}
                        onClose={() => setShowSyncScreen(false)}
                    />
                )}

                {showGeoTracker && (
                    <GeoTracker
                        initialCoords={{ lat: state.gps.lat || 4.908, lng: state.gps.lng || -73.948 }}
                        onClose={() => setShowGeoTracker(false)}
                        onConfirm={(c) => {
                            updateState({ gps: c });
                            setShowGeoTracker(false);
                            toast("🎯 Punto Exacto Fijado");
                        }}
                    />
                )}

                {/* MODAL CERRAR SESIÓN (Global) */}
                {showLogoutModal && isAuthorized && (
                    <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-[#1c2230] border border-[#2d3748] p-6 rounded-2xl w-full max-w-xs shadow-2xl text-center">
                            <div className="bg-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                                <LogOut size={32} className="text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Seguridad de Acceso</h3>
                            <p className="text-gray-400 text-[11px] mb-6 leading-relaxed">
                                <span className="text-amber-500 font-bold">⚠️ ADVERTENCIA:</span> Si cierras sesión y estás en una zona sin internet, <span className="text-white">no podrás volver a entrar</span> hasta tener señal.
                                <br /><br />
                                Escribe <span className="text-white font-bold">cerrar sesion</span> para confirmar:
                            </p>
                            <input
                                type="text"
                                className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center text-white font-bold mb-6 focus:border-blue-500 outline-none transition-all"
                                value={logoutConfirmText}
                                onChange={e => setLogoutConfirmText(e.target.value)}
                                placeholder="Escribe aquí..."
                            />
                            <div className="flex gap-3">
                                <button className="btn btn-ghost flex-1 py-3 text-xs" onClick={() => setShowLogoutModal(false)}>CANCELAR</button>
                                <button
                                    className="btn btn-danger flex-1 py-3 text-xs"
                                    onClick={() => {
                                        if (logoutConfirmText.toLowerCase() === 'cerrar sesion') {
                                            logout();
                                            setShowLogoutModal(false);
                                        } else {
                                            toast("❌ Escribe exactamente 'cerrar sesion'");
                                        }
                                    }}
                                >
                                    CERRAR SESIÓN
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TOAST NOTIFICATION */}
                <div id="toast" className={showToast ? 'show' : ''}>{toastMsg}</div>

                {/* PWA UPDATE NOTIFICATION BANNER */}
                {needRefresh && (
                    <div className="fixed bottom-20 left-4 right-4 bg-amber-500 text-black p-4 rounded-xl shadow-lg flex items-center justify-between z-[9999] border-2 border-amber-600">
                        <div className="flex items-center gap-2">
                            <RefreshCw size={20} className="animate-spin" />
                            <div>
                                <span className="font-bold text-sm block">¡Nueva versión disponible!</span>
                                <span className="text-[10px] opacity-80">Toca para aplicar cambios</span>
                            </div>
                        </div>
                        <button
                            onClick={() => updateServiceWorker(true)}
                            className="bg-black text-amber-500 px-4 py-2 rounded-lg font-bold text-xs shadow-md active:scale-95 transition-transform"
                        >
                            ACTUALIZAR
                        </button>
                    </div>
                )}

                {/* BOTTOM NAV */}
                <nav className="bottom-nav">
                    <button
                        className={`nav-btn ${activeScreen === 'sActivity' || activeScreen === 's0' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sActivity')}
                    >
                        <Home size={20} />
                        <span>Inicio</span>
                    </button>
                    <button
                        className={`nav-btn ${activeScreen === 'sFichas' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sFichas')}
                    >
                        <List size={20} />
                        <span>Fichas</span>
                    </button>
                    <button
                        className={`nav-btn ${activeScreen === 'sMaps' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sMaps')}
                    >
                        <MapPin size={20} />
                        <span>Mapa</span>
                    </button>
                    <button
                        className={`nav-btn ${activeScreen === 'sConfig' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sConfig')}
                    >
                        <SettingsIcon size={20} />
                        <span>Config</span>
                    </button>
                </nav>
            </div>
        </APIProvider>
    );
};

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

const FichaItemRow: React.FC<{ f: AppState; onEdit: () => void; onDelete: () => void }> = ({ f, onEdit, onDelete }) => {
    const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const check = async () => {
            if (f.fotoList && f.fotoList.length > 0) {
                const ids = f.fotoList.map(p => p.id);
                const pending = await checkPendingInList(ids);
                setPendingPhotos(pending);
            }
            setChecking(false);
        };
        check();
        const interval = setInterval(check, 10000); // Check cada 10s
        return () => clearInterval(interval);
    }, [f.fotoList]);

    const hasPending = pendingPhotos.length > 0;
    const totalPhotos = f.fotoList?.length || 0;

    return (
        <div className="ficha-item" onClick={onEdit}>
            <div className="ficha-item-title">
                <span className="flex items-center gap-2">
                    Pozo {f.pozo || '—'}
                    {f.synced ? (
                        <Cloud size={14} className="text-green-500" />
                    ) : (
                        <Cloud size={14} className="text-gray-600" />
                    )}
                </span>
                <span className={`badge ${f.sistema === 'PLUVIAL' ? 'badge-blue' : 'badge-orange'}`}>{f.sistema || '?'}</span>
            </div>
            <div className="ficha-item-meta" style={{ gap: '10px' }}>
                <span>📅 {f.fecha}</span>
                <span>📍 {f.barrio || f.municipio}</span>

                <span className="flex items-center gap-1">
                    <Camera size={12} />
                    {checking ? '...' : (
                        <span className={hasPending ? 'text-amber-500' : 'text-green-500'}>
                            {totalPhotos - pendingPhotos.length}/{totalPhotos}
                        </span>
                    )}
                </span>

                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="ml-auto p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

const SummaryItem: React.FC<{ label: string; val: string }> = ({ label, val }) => (
    <div className="summary-cell">
        <div className="summary-cell-label">{label}</div>
        <div className="summary-cell-val">{val || '—'}</div>
    </div>
);

const WellDiagram: React.FC<{ diam: number; altura: number; pipes?: Pipe[] }> = ({ diam, altura, pipes = [] }) => {
    const cx = 90;
    const bodyW = Math.min(140, Math.max(60, diam * 80));
    const bodyH = Math.min(160, Math.max(60, altura * 35));
    const coneH = 30;
    const canoH = 15;
    const tapW = 30;
    const tapH = 10;

    const bodyTop = 50;
    const bodyBot = bodyTop + bodyH;
    const canoBot = bodyBot + canoH;
    const coneTop = bodyTop - coneH;
    const tapTop = coneTop - tapH - 2;

    return (
        <svg id="wellSvg" viewBox={`0 0 180 ${canoBot + 20}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1C2230" />
                    <stop offset="50%" stopColor="#2A3347" />
                    <stop offset="100%" stopColor="#1C2230" />
                </linearGradient>
            </defs>
            <text x="4" y={tapTop + 8} fontFamily="DM Mono" fontSize="8" fill="#5B6B8A">TAPA</text>

            {/* Cone / Reducer matching body width */}
            <path d={`M${cx - tapW / 2},${coneTop} L${cx - bodyW / 2},${bodyTop} L${cx + bodyW / 2},${bodyTop} L${cx + tapW / 2},${coneTop} Z`} fill="url(#bodyGrad)" stroke="#334060" />

            {/* Body */}
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill="url(#bodyGrad)" stroke="#334060" />

            {/* Highlighted Diameter Line starting from top (Cone/Tapa level) */}
            <line x1={cx - tapW / 2} y1={coneTop + 4} x2={cx + tapW / 2} y2={coneTop + 4} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" />
            <text x={cx} y={coneTop + 2} textAnchor="middle" fontSize="6" fill="#3b82f6" fontWeight="bold">Ø {diam}m</text>

            {/* Visual Pipes */}
            {pipes.map((p, i) => {
                const isEntrada = p.es === 'ENTRADA';
                const xPos = isEntrada ? cx - bodyW / 2 - 10 : cx + bodyW / 2 - 10;
                const yPos = bodyBot - 10 - (i * 8);
                return (
                    <rect
                        key={p.id}
                        x={xPos}
                        y={yPos}
                        width="20"
                        height="6"
                        fill={isEntrada ? "var(--blue)" : "var(--orange)"}
                        opacity="0.8"
                        rx="1"
                    />
                );
            })}

            <text x={cx} y={bodyTop + bodyH + 18} fontFamily="DM Mono" fontSize="8" fill="#00C896" textAnchor="middle">ø{diam.toFixed(2)}m</text>
            <text x={cx - bodyW / 2 - 10} y={bodyTop + bodyH / 2} fontFamily="DM Mono" fontSize="8" fill="#0084FF" textAnchor="end">{altura.toFixed(2)}m</text>
        </svg>
    );
};

const ComponentEditor: React.FC<{
    label: string;
    data: ComponentState;
    onChange: (v: Partial<ComponentState>) => void;
    materials: string[];
    isCono?: boolean;
}> = ({ label, data, onChange, materials, isCono }) => (
    <div className="comp-section">
        <div className="comp-section-title">{label}</div>
        <div className="comp-row">
            <div className="flex justify-between items-center">
                <span className="comp-label">Existe</span>
                <div className="toggle3 w-32">
                    <button className={`t-si ${data.existe === 'SI' ? 'active-si' : ''}`} onClick={() => onChange({ existe: 'SI' })}>SI</button>
                    <button className={`t-no ${data.existe === 'NO' ? 'active-no' : ''}`} onClick={() => onChange({ existe: 'NO', mat: '-', estado: '-' })}>NO</button>
                    <button className={`t-dk ${data.existe === 'DESCONOCIDO' ? 'active-dk' : ''}`} onClick={() => onChange({ existe: 'DESCONOCIDO', mat: '-', estado: '-' })}>DESC.</button>
                </div>
            </div>

            {data.existe === 'SI' ? (
                <>
                    <div>
                        <label className="comp-label">{isCono ? 'Tipo' : 'Material'}</label>
                        <div className="chips">
                            {materials.map(m => (
                                <div key={m} className={`chip ${(data.mat === m && m !== 'OTRO') || (m === 'OTRO' && data.mat && !materials.includes(data.mat as string)) || (data.mat === 'OTRO' && m === 'OTRO') ? 'selected' : ''}`} onClick={() => onChange({ mat: m })}>
                                    {m}
                                </div>
                            ))}
                        </div>
                        {((data.mat && !materials.includes(data.mat as string)) || data.mat === 'OTRO') && (
                            <input
                                type="text"
                                maxLength={60}
                                value={data.mat === 'OTRO' ? '' : data.mat}
                                onChange={e => onChange({ mat: e.target.value.toUpperCase() })}
                                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '10px', marginTop: '8px', color: 'var(--text)', borderRadius: '8px', fontSize: '12px' }}
                                placeholder="ESPECIFIQUE..."
                            />
                        )}
                    </div>
                    <div>
                        <label className="comp-label">Estado</label>
                        <div className="semaphore">
                            {['bueno', 'regular', 'malo', 'desconocido'].map(e => (
                                <button
                                    key={e}
                                    className={`sem-btn s-${e === 'bueno' ? 'good' : e === 'regular' ? 'reg' : e === 'malo' ? 'bad' : 'unk'} ${data.estado === e ? 'active' : ''}`}
                                    onClick={() => onChange({ estado: e })}
                                >
                                    {e === 'desconocido' ? 'Desconocido' : e[0].toUpperCase() + e.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {label === 'Peldaños' && (
                        <div>
                            <label className="comp-label">Cantidad de Peldaños</label>
                            <input
                                type="number"
                                value={data.num || ''}
                                onChange={e => onChange({ num: parseInt(e.target.value) || 0 })}
                                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '10px', marginTop: '4px', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }}
                                placeholder="0"
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className="text-[10px] text-gray-500 italic mt-2 py-4 border-t border-dashed border-white/5 text-center bg-black/10 rounded-lg">
                    {data.existe === 'NO' ? 'Componente marcado como INEXISTENTE. Campos deshabilitados.' : 'Estado del componente DESCONOCIDO. Campos deshabilitados.'}
                </div>
            )}
        </div>
    </div>
);

const PipeCard: React.FC<{ pipe: Pipe; index: number; onUpdate: (u: Partial<Pipe>) => void; onDelete: () => void }> = ({ pipe, index, onUpdate, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="pipe-card">
            <div className="pipe-card-header" onClick={() => setIsOpen(!isOpen)}>
                <div className="pipe-card-label">
                    <span className={`pipe-badge ${pipe.es === 'ENTRADA' ? 'entrada' : 'salida'}`}>{pipe.es}</span>
                    Tubería {index + 1} {pipe.deA && `· ${pipe.deA}`}
                </div>
                <div className="flex items-center gap-2">
                    {isOpen ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} />}
                    <Trash2 size={14} className="text-red-500" onClick={onDelete} />
                </div>
            </div>
            <div className={`pipe-body ${isOpen ? 'open' : ''}`}>
                <div className="pipe-toggle">
                    <button className={pipe.es === 'ENTRADA' ? 'e-active' : ''} onClick={() => onUpdate({ es: 'ENTRADA' })}>⬇ ENTRADA</button>
                    <button className={pipe.es === 'SALIDA' ? 's-active' : ''} onClick={() => onUpdate({ es: 'SALIDA' })}>⬆ SALIDA</button>
                </div>
                <div className="field-row">
                    <div className="field" style={{ flex: 2 }}><label>De/Hasta</label><input type="text" value={pipe.deA} onChange={e => onUpdate({ deA: e.target.value })} placeholder="Ej: P-002" /></div>
                    <div className="field" style={{ flex: 1.5 }}>
                        <label className="flex justify-between">
                            Ø
                            <span className="unit-toggle">
                                <button className={(!pipe.unit || pipe.unit === 'mm') ? 'active' : ''} onClick={(e) => { e.preventDefault(); onUpdate({ unit: 'mm' }); }}>mm</button>
                                <button className={pipe.unit === 'in' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onUpdate({ unit: 'in' }); }}>in</button>
                            </span>
                        </label>
                        <input type="number" value={pipe.diam} onChange={e => onUpdate({ diam: e.target.value })} placeholder="0" />
                    </div>
                </div>
                <div className="field-row">
                    <div className="field">
                        <label>Material</label>
                        <select value={pipe.mat && ['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL'].includes(pipe.mat) ? pipe.mat : pipe.mat ? 'OTRO' : ''} onChange={e => onUpdate({ mat: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}>
                            <option value="">—</option>
                            <option>CONCRETO</option>
                            <option>PVC CORRUGADO</option>
                            <option>PVC LISO</option>
                            <option>PLÁSTICO</option>
                            <option>ASBESTO CEMENTO</option>
                            <option>MAMPOSTERIA</option>
                            <option>GRES</option>
                            <option>GRP</option>
                            <option>METAL</option>
                            <option>OTRO</option>
                        </select>
                        {(!['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL', ''].includes(pipe.mat) || pipe.mat === 'OTRO') && (
                            <input
                                type="text"
                                maxLength={60}
                                value={pipe.mat === 'OTRO' ? '' : pipe.mat}
                                onChange={e => onUpdate({ mat: e.target.value.toUpperCase() })}
                                className="mt-2 bg-gray-800 text-white border-blue-500/30"
                                placeholder="Especifique Material..."
                            />
                        )}
                    </div>
                </div>
                <div className="field-row">
                    <div className="field">
                        <label>Estado Tub.</label>
                        <select value={pipe.estado && ['LIMPIO', 'INUNDADO', 'SEDIMENTADO', 'COLMATADO', 'CON BASURAS'].includes(pipe.estado) ? pipe.estado : pipe.estado ? 'OTRO' : ''} onChange={e => onUpdate({ estado: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}>
                            <option value="">—</option>
                            <option>LIMPIO</option>
                            <option>INUNDADO</option>
                            <option>SEDIMENTADO</option>
                            <option>COLMATADO</option>
                            <option>CON BASURAS</option>
                            <option>OTRO</option>
                        </select>
                        {(!['LIMPIO', 'INUNDADO', 'SEDIMENTADO', 'COLMATADO', 'CON BASURAS', ''].includes(pipe.estado || '') || pipe.estado === 'OTRO') && (
                            <input
                                type="text"
                                value={pipe.estado === 'OTRO' ? '' : pipe.estado}
                                onChange={e => onUpdate({ estado: e.target.value.toUpperCase() })}
                                className="mt-2 bg-gray-800 text-white border-blue-500/30 text-xs"
                                placeholder="Especifique Estado..."
                            />
                        )}
                    </div>
                    <div className="field">
                        <label>Emboquillado</label>
                        <select value={pipe.emboq} onChange={e => onUpdate({ emboq: e.target.value })}>
                            <option value="">—</option>
                            <option value="SI">SI</option>
                            <option value="NO">NO</option>
                            <option value="DESC">DESC</option>
                        </select>
                    </div>
                </div>
                <div className="field-row">
                    <div className="field">
                        <label>Cota Batea Z <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                        <input type="number" step="0.01" value={pipe.cotaZ}
                            onFocus={numFocus}
                            onChange={e => onUpdate({ cotaZ: e.target.value })}
                            placeholder="0.00 m" className="bg-gray-800 text-green-400 font-mono" />
                    </div>
                    <div className="field">
                        <label>Cota Clave Z+Ø <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                        <input
                            type="text"
                            readOnly
                            value={(() => {
                                const z = parseFloat(pipe.cotaZ) || 0;
                                let d = parseFloat(pipe.diam) || 0;
                                if (pipe.unit === 'in') d = (d * 25.4); // mm
                                const d_m = d / 1000; // metros
                                return (z + d_m).toFixed(3);
                            })()}
                            className="bg-gray-900 text-blue-300 font-mono opacity-80 cursor-not-allowed"
                        />
                    </div>
                </div>
                <div className="field">
                    <label>Pendiente (%)</label>
                    <input type="text" value={pipe.pendiente} onChange={e => onUpdate({ pendiente: e.target.value })} placeholder="0.0%" className="bg-gray-800 text-yellow-400 font-mono text-center" />
                </div>
            </div>
        </div>
    );
};

const SumideroCard: React.FC<{ sum: Sumidero; index: number; onUpdate: (u: Partial<Sumidero>) => void; onDelete: () => void }> = ({ sum, index, onUpdate, onDelete }) => (
    <div className="sum-card">
        <button className="del-sum" onClick={onDelete}><Trash2 size={14} /></button>
        <div className="comp-section-title">Sumidero {index + 1} ({sum.codEsquema})</div>

        <div className="field-row">
            <div className="field"><label>Cód. Esquema</label><input type="text" value={sum.codEsquema} onChange={e => onUpdate({ codEsquema: e.target.value })} placeholder="S-001" /></div>
            <div className="field">
                <label>Tipo Sumidero</label>
                <select value={['COMBINADO O MIXTO', 'VENTANA O LATERAL', 'REJILLA', 'RANURADOS', 'TRANSVERSAL'].includes(sum.tipo) ? sum.tipo : sum.tipo ? 'OTRO' : ''} onChange={e => onUpdate({ tipo: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}>
                    <option value="">—</option>
                    <option>COMBINADO O MIXTO</option>
                    <option>VENTANA O LATERAL</option>
                    <option>REJILLA</option>
                    <option>RANURADOS</option>
                    <option>TRANSVERSAL</option>
                    <option>OTRO</option>
                </select>
                {(!['COMBINADO O MIXTO', 'VENTANA O LATERAL', 'REJILLA', 'RANURADOS', 'TRANSVERSAL', ''].includes(sum.tipo) || sum.tipo === 'OTRO') && (
                    <input type="text" value={sum.tipo === 'OTRO' ? '' : sum.tipo} onChange={e => onUpdate({ tipo: e.target.value.toUpperCase() })} className="mt-1 text-xs" placeholder="Especifique..." />
                )}
            </div>
        </div>

        <div className="field-row">
            <div className="field">
                <label>Estado</label>
                <select value={['SIN REPRESAMIENTO', 'INUNDADO', 'COLMATADO', 'OCULTO'].includes(sum.estado) ? sum.estado : sum.estado ? 'OTRO' : ''} onChange={e => onUpdate({ estado: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}>
                    <option value="">—</option>
                    <option>SIN REPRESAMIENTO</option>
                    <option>INUNDADO</option>
                    <option>COLMATADO</option>
                    <option>OCULTO</option>
                    <option>OTRO</option>
                </select>
                {(!['SIN REPRESAMIENTO', 'INUNDADO', 'COLMATADO', 'OCULTO', ''].includes(sum.estado) || sum.estado === 'OTRO') && (
                    <input type="text" value={sum.estado === 'OTRO' ? '' : sum.estado} onChange={e => onUpdate({ estado: e.target.value.toUpperCase() })} className="mt-1 text-xs" placeholder="Especifique..." />
                )}
            </div>
            <div className="field">
                <label>Mat. Rejilla</label>
                <select value={['DESCONOCIDO', 'CONCRETO', 'METAL DÚCTIL', 'POLIPROPILENO'].includes(sum.matRejilla) ? sum.matRejilla : sum.matRejilla ? 'OTRO' : ''} onChange={e => onUpdate({ matRejilla: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}>
                    <option value="">—</option>
                    <option>DESCONOCIDO</option>
                    <option>CONCRETO</option>
                    <option>METAL DÚCTIL</option>
                    <option>POLIPROPILENO</option>
                    <option>OTRO</option>
                </select>
                {(!['DESCONOCIDO', 'CONCRETO', 'METAL DÚCTIL', 'POLIPROPILENO', ''].includes(sum.matRejilla) || sum.matRejilla === 'OTRO') && (
                    <input type="text" maxLength={60} value={sum.matRejilla === 'OTRO' ? '' : sum.matRejilla} onChange={e => onUpdate({ matRejilla: e.target.value.toUpperCase() })} className="mt-1 text-xs" placeholder="Especifique..." />
                )}
            </div>
        </div>

        <div className="field-row">
            <div className="field">
                <label>Mat. Caja</label>
                <select value={['DESCONOCIDO', 'CONCRETO', 'MAMPOSTERIA'].includes(sum.matCaja) ? sum.matCaja : sum.matCaja ? 'OTRO' : ''} onChange={e => onUpdate({ matCaja: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}>
                    <option value="">—</option>
                    <option>DESCONOCIDO</option>
                    <option>CONCRETO</option>
                    <option>MAMPOSTERIA</option>
                    <option>OTRO</option>
                </select>
                {(!['DESCONOCIDO', 'CONCRETO', 'MAMPOSTERIA', ''].includes(sum.matCaja) || sum.matCaja === 'OTRO') && (
                    <input type="text" value={sum.matCaja === 'OTRO' ? '' : sum.matCaja} onChange={e => onUpdate({ matCaja: e.target.value.toUpperCase() })} className="mt-1 text-xs" placeholder="Especifique..." />
                )}
            </div>
            <div className="field" style={{ flex: 1.5 }}>
                <label className="flex justify-between">
                    Ø Tub. Salida
                    <span className="unit-toggle">
                        <button className={(!sum.unitTub || sum.unitTub === 'mm') ? 'active' : ''} onClick={(e) => { e.preventDefault(); onUpdate({ unitTub: 'mm' }); }}>mm</button>
                        <button className={sum.unitTub === 'in' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onUpdate({ unitTub: 'in' }); }}>in</button>
                    </span>
                </label>
                <input type="number" value={sum.diamTub} onChange={e => onUpdate({ diamTub: e.target.value })} placeholder="0" />
            </div>
        </div>

        <div className="field">
            <label>Material Tubería Salida</label>
            <select value={['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL'].includes(sum.matTub) ? sum.matTub : sum.matTub ? 'OTRO' : ''} onChange={e => onUpdate({ matTub: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}>
                <option value="">—</option>
                <option>CONCRETO</option>
                <option>PVC CORRUGADO</option>
                <option>PVC LISO</option>
                <option>PLÁSTICO</option>
                <option>ASBESTO CEMENTO</option>
                <option>MAMPOSTERIA</option>
                <option>GRES</option>
                <option>GRP</option>
                <option>METAL</option>
                <option>OTRO</option>
            </select>
            {(!['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL', ''].includes(sum.matTub) || sum.matTub === 'OTRO') && (
                <input type="text" maxLength={60} value={sum.matTub === 'OTRO' ? '' : sum.matTub} onChange={e => onUpdate({ matTub: e.target.value.toUpperCase() })} className="mt-1 text-xs" placeholder="Especifique..." />
            )}
        </div>
    </div>
);

const PhotoZone: React.FC<{ label: string; icon: React.ReactNode; photos: string[]; onAdd: (img: string) => void; onDelete: (idx: number) => void }> = ({ label, icon, photos, onAdd, onDelete }) => {
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onAdd(ev.target?.result as string);
        reader.readAsDataURL(file);
    };
    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                <span className="text-[9px] text-blue-400 font-mono">Cola Drive: ☁ Sincronizando...</span>
            </div>
            <div className="photo-zone">
                <input type="file" accept="image/*" capture="environment" onChange={handleFile} />
                <div className="pz-icon">{icon}</div>
                <div className="pz-label">Tocar para Captura</div>
            </div>
            <div className="photo-thumbs">
                {photos.map((p, i) => (
                    <div key={i} className="photo-thumb">
                        <img src={p} alt="thumb" />
                        <button className="del-photo" onClick={() => onDelete(i)}>✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
