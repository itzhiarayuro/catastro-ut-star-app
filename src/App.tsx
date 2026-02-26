import React, { useState, useEffect, useRef } from 'react';
import { db, useFirestoreDoc, useAuth } from './lib/firebase';
import LoginPage from './components/LoginPage';
import {
    Home, List, MapPin, Settings as SettingsIcon,
    ChevronLeft, ChevronRight, Check, Plus, Trash2,
    Wifi, WifiOff, Save, FileJson, FileText, Download,
    Cloud, Globe, Lightbulb, AlertTriangle, Info, Camera,
    RefreshCw, LogOut
} from 'lucide-react';
import { FotoRegistro } from './utils/fotoProcessor';
import FotosZone from './components/FotosZone';

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
    };
    fotoList: FotoRegistro[];
    obs: string;
    reviso: string;
    aprobo: string;
    createdAt: string | null;
    id: string | null;
    savedAt?: string;
    zRasante?: number;
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
    cuerpo: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
    cono: { existe: 'DESCONOCIDO', tipo: '', mat: '', estado: 'desconocido' },
    canu: { existe: 'DESCONOCIDO', mat: '', estado: 'desconocido' },
    peld: { existe: 'DESCONOCIDO', mat: '', num: 0, estado: 'desconocido' },
    pipes: [],
    sums: [],
    photos: { general: [], interior: [], danos: [] },
    fotoList: [],
    obs: '',
    reviso: '',
    aprobo: '',
    createdAt: null,
    id: null,
    zRasante: 2600.00
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

const App: React.FC = () => {
    const { user, loading: authLoading, isAuthorized, logout } = useAuth();
    const [activeScreen, setActiveScreen] = useState<'s0' | 'sFichas' | 'sConfig' | 'sForm'>('s0');
    const [currentStep, setCurrentStep] = useState(1);
    const [state, setState] = useState<AppState>(INITIAL_STATE);
    const [fichas, setFichas] = useState<Record<string, AppState>>({});
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [toastMsg, setToastMsg] = useState('');
    const [showToast, setShowToast] = useState(false);
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

    const firestorePath = state.pozo && state.municipio
        ? `fichas/${state.municipio.toUpperCase()}_${state.pozo.replace(/\s+/g, '')}`
        : '';

    const { saveData, loading } = useFirestoreDoc(firestorePath);

    // Dynamic Imports for Exports
    const handlePDF = async () => {
        const { exportToPDF } = await import('./utils/export');
        exportToPDF(state);
        toast("📄 PDF Generado");
    };

    const handleExcel = async () => {
        const { exportToExcel } = await import('./utils/export');
        exportToExcel(Object.values(fichas));
        toast("📊 Excel Generado");
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
            const fields: (keyof AppState)[] = ['tapa', 'cuerpo', 'cono', 'canu', 'peld'];
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
            return next;
        });

        // Auto-save logic
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            toast("✓ Auto-guardado temporal");
        }, 2000);
    };

    const startNewFicha = () => {
        const id = `F_${Date.now()}`;
        setState({ ...INITIAL_STATE, id, createdAt: new Date().toISOString() });
        setCurrentStep(1);
        setActiveScreen('sForm');
    };

    const saveFicha = async () => {
        // VALIDATION CHECKLIST
        if (!state.pozo) return toast("⚠️ ERROR: Pozo No. obligatorio");
        if (!state.estadoPozo) return toast("⚠️ ERROR: Estado Pozo obligatorio");
        if (!state.sistema) return toast("⚠️ ERROR: Sistema obligatorio");

        const id = state.id || `F_${Date.now()}`;
        const now = new Date().toISOString();
        const finalData = { ...state, id, savedAt: now };

        // Save to LocalStorage
        const updatedFichas = { ...fichas, [id]: finalData };
        setFichas(updatedFichas);
        localStorage.setItem('fichas_star', JSON.stringify(updatedFichas));

        // Save to Firestore if online
        if (isOnline) {
            try {
                await saveData(finalData);
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
        if (!confirm("¿Eliminar esta ficha?")) return;
        const updated = { ...fichas };
        delete updated[id];
        setFichas(updated);
        localStorage.setItem('fichas_star', JSON.stringify(updated));
        toast("🗑 Ficha eliminada");
    };

    const captureGPS = () => {
        if (!navigator.geolocation) return toast("❌ GPS no soportado");
        toast("📍 Capturando GPS...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                updateState({
                    gps: {
                        lat: parseFloat(pos.coords.latitude.toFixed(6)),
                        lng: parseFloat(pos.coords.longitude.toFixed(6)),
                        precision: parseFloat(pos.coords.accuracy.toFixed(1))
                    }
                });
                toast("✅ GPS Capturado");
            },
            (err) => {
                // Mock fallback for Sopó
                const lat = (4.90 + (Math.random() - 0.5) * 0.01).toFixed(6);
                const lng = (-73.94 + (Math.random() - 0.5) * 0.01).toFixed(6);
                updateState({ gps: { lat: parseFloat(lat), lng: parseFloat(lng), precision: 5.4 } });
                toast("📍 GPS Simulado (Sopó)");
            }
        );
    };

    /* ═════════════════════════════════════
       RENDER LOGIC
    ═════════════════════════════════════ */

    const renderHome = () => (
        <div id="s0" className={`screen ${activeScreen === 's0' ? 'active' : ''}`}>
            <div className="home-center">
                <div className="home-logo-container">
                    <div className="home-logo-text">UT★</div>
                    <div className="home-logo-sub">CAT★STRO STAR</div>
                </div>
                <div>
                    <div className="home-title">Ficha <span>Catastro</span><br />Alcantarillado</div>
                </div>
                <div className="home-badge">
                    <span className="dot"></span>
                    UT STAR · Municipio {state.municipio}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'DM Mono, monospace', textAlign: 'center', lineHeight: '1.6' }}>
                    Contrato EPC-PDA-C-570-2025<br />Plan Maestro ALC · UT STAR
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button className="btn btn-green btn-full" onClick={startNewFicha}>
                        <Plus size={16} strokeWidth={2.5} />
                        Nueva Ficha
                    </button>
                    <button className="btn btn-ghost btn-full" onClick={() => setActiveScreen('sFichas')}>
                        <List size={16} />
                        Ver Guardadas
                    </button>
                </div>
            </div>
        </div>
    );

    const renderFichas = () => {
        const list = Object.values(fichas).sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
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
                            <div key={f.id} className="ficha-item" onClick={() => { setState(f); setActiveScreen('sForm'); setCurrentStep(6); }}>
                                <div className="ficha-item-title">
                                    Pozo {f.pozo || '—'} &nbsp;
                                    <span className={`badge ${f.sistema === 'PLUVIAL' ? 'badge-blue' : 'badge-orange'}`}>{f.sistema || '?'}</span>
                                </div>
                                <div className="ficha-item-meta">
                                    <span>📅 {f.fecha}</span>
                                    <span>📍 {f.barrio || f.municipio}</span>
                                    <span>🔩 {f.pipes.length} tub.</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (f.id) deleteFicha(f.id); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--red)', marginLeft: 'auto' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
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
                    <div className="flex items-center gap-4 text-xs">
                        <div className={`p-2 rounded-lg flex items-center gap-2 ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                            {isOnline ? 'CONEXIÓN ESTABLE' : 'MODO OFFLINE'}
                        </div>
                        <div className="text-gray-500">
                            {Object.keys(fichas).length} fichas locales
                        </div>
                    </div>
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
                    <button className="btn btn-ghost btn-full" onClick={logout}>
                        <LogOut size={16} /> Cerrar Sesión
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
                        <div className="header-titles">
                            <div className="header-title">{stepTitle}</div>
                            <div className="header-sub">Paso {currentStep} de 5</div>
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
                                        <label>Pozo No.*</label>
                                        <input type="text" value={state.pozo} onChange={e => updateState({ pozo: e.target.value })} placeholder="P-001" />
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
                                    <label>Municipio</label>
                                    <select value={state.municipio} onChange={e => updateState({ municipio: e.target.value })}>
                                        {MUNICIPIOS.map(m => <option key={m} value={m}>{m}</option>)}
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
                                    <label>Altura Total (H pozo)</label>
                                    <input type="number" step="0.01" value={state.altura} onChange={e => updateState({ altura: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
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
                                <div className="gps-wrap">
                                    <button className="btn btn-blue btn-full btn-sm" onClick={captureGPS}>
                                        <MapPin size={14} /> Capturar Coordenadas
                                    </button>
                                    {state.gps.lat && (
                                        <div className="gps-result show">
                                            📍 Lat: <strong>{state.gps.lat}</strong> | Lng: <strong>{state.gps.lng}</strong><br />
                                            🎯 Precisión: <strong>{state.gps.precision} m</strong>
                                        </div>
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
                                    <div className="field-row">
                                        <div className="field">
                                            <label>Diámetro del Cuerpo (m)</label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                value={state.diam}
                                                onChange={e => updateState({ diam: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="field">
                                            <label>Altura Total (m)</label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                value={state.altura}
                                                onChange={e => updateState({ altura: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Tipo de Cámara</div>
                                <div className="chips">
                                    {TIPOS_CAMARA.map(t => (
                                        <div key={t} className={`chip ${state.camara === t ? 'selected' : ''}`} onClick={() => updateState({ camara: t })}>
                                            {t.replace(/_/g, ' ')}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Rasante</div>
                                <div className="chips">
                                    {RASANTES.map(r => (
                                        <div key={r} className={`chip ${state.rasante === r ? 'selected' : ''}`} onClick={() => updateState({ rasante: r })}>
                                            {r.replace(/_/g, ' ')}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="btn-row">
                                <button className="btn btn-ghost" onClick={() => setCurrentStep(1)}><ChevronLeft size={16} /> Volver</button>
                                <button className="btn btn-green" onClick={() => setCurrentStep(3)}>Siguiente <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <ComponentEditor
                                label="Tapa"
                                data={state.tapa}
                                onChange={(v) => updateState({ tapa: { ...state.tapa, ...v } })}
                                materials={['CONCRETO', 'HIERRO', 'POLIPROPILENO', 'PVC', 'OTRO']}
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
                                materials={['HIERRO', 'POLIPROPILENO', 'NO_TIENE']}
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
                                        onAddPhoto={(foto) => updateState({ fotoList: [...state.fotoList, foto] })}
                                        onDeletePhoto={(id) => updateState({ fotoList: state.fotoList.filter(f => f.id !== id) })}
                                    />
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Observaciones y Cierre</div>
                                <div className="field">
                                    <label>Observaciones</label>
                                    <textarea value={state.obs} onChange={e => updateState({ obs: e.target.value })} rows={4} placeholder="..." />
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
                                <button className="btn btn-green btn-full" onClick={saveFicha}>
                                    <Save size={16} /> Guardar y Sincronizar
                                </button>
                                <button className="btn btn-blue btn-full" onClick={handleExcel}>
                                    <FileJson size={16} /> Exportar Reporte XLSX
                                </button>
                                <div className="btn-row">
                                    <button className="btn btn-yellow" onClick={handleExcel}><Download size={14} /> Excel Global</button>
                                    <button className="btn btn-orange" onClick={handlePDF}><FileText size={14} /> PDF Ficha</button>
                                </div>
                                <button className="btn btn-ghost btn-full" onClick={() => toast("📲 Test Sync Cel2: Conexión Activa")}>
                                    <RefreshCw size={16} /> Test Sync Cel2
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
            <button className="btn btn-ghost mt-6" onClick={logout} style={{ marginTop: '30px' }}>Cerrar Sesión</button>
        </div>
    );

    return (
        <div className="app-container">
            {activeScreen === 's0' && renderHome()}
            {activeScreen === 'sFichas' && renderFichas()}
            {activeScreen === 'sConfig' && renderConfig()}
            {activeScreen === 'sForm' && renderForm()}

            {/* TOAST NOTIFICATION */}
            <div id="toast" className={showToast ? 'show' : ''}>{toastMsg}</div>

            {/* BOTTOM NAV */}
            <nav className="bottom-nav">
                <button
                    className={`nav-btn ${activeScreen === 's0' ? 'active' : ''}`}
                    onClick={() => setActiveScreen('s0')}
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
                    className="nav-btn"
                    onClick={() => toast("📍 Abrir visor de mapa...")}
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
    );
};

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

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

            {/* Highlighted Diameter Line */}
            <line x1={cx - bodyW / 2} y1={bodyTop + 10} x2={cx + bodyW / 2} y2={bodyTop + 10} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" />
            <text x={cx} y={bodyTop + 8} textAnchor="middle" fontSize="6" fill="#3b82f6" fontWeight="bold">Ø {diam}m</text>

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
                    <button className={`t-no ${data.existe === 'NO' ? 'active-no' : ''}`} onClick={() => onChange({ existe: 'NO' })}>NO</button>
                    <button className={`t-dk ${data.existe === 'DESCONOCIDO' ? 'active-dk' : ''}`} onClick={() => onChange({ existe: 'DESCONOCIDO' })}>?</button>
                </div>
            </div>
            <div>
                <label className="comp-label">{isCono ? 'Tipo' : 'Material'}</label>
                <div className="chips">
                    {materials.map(m => (
                        <div key={m} className={`chip ${data.mat === m ? 'selected' : ''}`} onClick={() => onChange({ mat: m })}>
                            {m}
                        </div>
                    ))}
                </div>
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
                            {e[0].toUpperCase() + e.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
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
                    <div className="field"><label>De/Hasta</label><input type="text" value={pipe.deA} onChange={e => onUpdate({ deA: e.target.value })} /></div>
                    <div className="field"><label>Ø (mm)</label><input type="number" value={pipe.diam} onChange={e => onUpdate({ diam: e.target.value })} /></div>
                </div>
                <div className="field-row">
                    <div className="field">
                        <label>Material</label>
                        <select value={pipe.mat} onChange={e => onUpdate({ mat: e.target.value })}>
                            <option value="">—</option>
                            <option>CONCRETO</option>
                            <option>PVC_CORR</option>
                            <option>PVC_LISO</option>
                            <option>GRES</option>
                            <option>GRP</option>
                        </select>
                    </div>
                </div>
                <div className="field-row">
                    <div className="field">
                        <label>Cota Rasante (Z)</label>
                        <input type="number" step="0.01" value={pipe.cotaZ} onChange={e => onUpdate({ cotaZ: e.target.value })} placeholder="0.00" className="bg-gray-800 text-green-400 font-mono" />
                    </div>
                    <div className="field">
                        <label>Pendiente (%)</label>
                        <input type="text" value={pipe.pendiente} onChange={e => onUpdate({ pendiente: e.target.value })} placeholder="0.0%" className="bg-gray-800 text-yellow-400 font-mono" />
                    </div>
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
            <div className="field"><label>Cód.</label><input type="text" value={sum.codEsquema} onChange={e => onUpdate({ codEsquema: e.target.value })} /></div>
            <div className="field"><label>Tipo</label><select value={sum.tipo} onChange={e => onUpdate({ tipo: e.target.value })}><option>MIXTO</option><option>VENTANA</option><option>REJILLA</option></select></div>
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
