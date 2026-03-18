import React from 'react';
import {
    ChevronLeft, ChevronRight, Check, Plus, RefreshCw,
    Navigation, AlertTriangle, Globe, List, Save,
    FileJson, FileText, Download
} from 'lucide-react';
import { Crosshair, LocateFixed, Signal } from 'lucide-react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';

import { useAppStore } from '../../hooks/useAppStore';
import { numFocus } from '../../utils/ui';
import {
    AppState, Pipe, SISTEMAS, RASANTES, ESTADOS_POZO,
    TIPOS_CAMARA
} from '../../types/catastro';
import { FotoRegistro } from '../../utils/fotoProcessor';
import FotosZone from '../../components/FotosZone';
import ManholeDiagram from '../../components/ManholeDiagram';
import WellDiagram from '../components/WellDiagram';
import ComponentEditor from '../components/ComponentEditor';
import PipeCard from '../../components/forms/PipeCard';
import SumideroCard from '../../components/forms/SumideroCard';

const POZO_PREFIX = 'P';

/* ── Small summary cell used in the final review step ── */
const SummaryItem: React.FC<{ label: string; val: string }> = ({ label, val }) => (
    <div className="summary-cell">
        <div className="summary-cell-label">{label}</div>
        <div className="summary-cell-val">{val || '-'}</div>
    </div>
);

/* ── Props ── */
interface FormPageProps {
    /** Called whenever the user triggers a toast notification */
    toast: (msg: string) => void;
    /** Whether the Firestore save is in progress */
    loading: boolean;
    /** Save the current ficha (async) */
    saveFicha: () => Promise<void>;
    /** Export the current ficha to Excel */
    handleExcel: () => void;
    /** Generate PDF for the current ficha */
    handlePDF: (customPozo?: AppState) => Promise<void>;
    /** Whether PDF generation is in progress */
    pdfLoading: boolean;
    /** Trigger the GeoTracker modal */
    setShowGeoTracker: (show: boolean) => void;
    /** Start a brand-new ficha */
    startNewFicha: () => void;
    /** Save a photo to local storage (for GeoTracker screenshot) */
    savePhotoToStorage?: (photo: any) => Promise<void>;
}

const FormPage: React.FC<FormPageProps> = ({
    toast,
    loading,
    saveFicha,
    handleExcel,
    handlePDF,
    pdfLoading,
    setShowGeoTracker,
    startNewFicha,
}) => {
    const store = useAppStore();
    const {
        setState,
        activeScreen, setActiveScreen,
        currentStep, setCurrentStep,
        ...state
    } = store;

    /* ── Local helpers ── */
    const updateState = (updates: Partial<AppState>) => {
        setState({ ...state, ...updates });
    };

    const captureGPS = () => {
        if (!navigator.geolocation) return toast('❌ GPS no soportado');
        toast('📝 Capturando GPS...');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                updateState({
                    gps: {
                        lat: parseFloat(pos.coords.latitude.toFixed(7)),
                        lng: parseFloat(pos.coords.longitude.toFixed(7)),
                        precision: parseFloat(pos.coords.accuracy.toFixed(1)),
                    },
                });
                toast('✅ GPS Capturado (Alta Precisión)');
            },
            () => {
                const lat = (4.908 + (Math.random() - 0.5) * 0.001).toFixed(7);
                const lng = (-73.948 + (Math.random() - 0.5) * 0.001).toFixed(7);
                updateState({ gps: { lat: parseFloat(lat), lng: parseFloat(lng), precision: 5.4 } });
                toast('📝 GPS Simulado (Sopó)');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    /* ── Step metadata ── */
    const steps = ['Identificación', 'Geometría', 'Componentes', 'Tuberías', 'Fotos', 'Resumen'];
    const stepTitle = steps[currentStep - 1];

    return (
        <div id="sForm" className={`screen ${activeScreen === 'sForm' ? 'active' : ''} `}>
            {/* ── Header ── */}
            <div className="app-header">
                <div className="header-inner">
                    <button
                        onClick={() => { if (confirm('¿Salir?')) setActiveScreen('s0'); }}
                        className="btn-ghost"
                        style={{ padding: '8px', border: 'none' }}
                    >
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

            {/* ── Progress bar & step chips ── */}
            {currentStep <= 5 && (
                <>
                    <div className="progress-wrap">
                        <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${(currentStep / 5) * 100}% ` }}></div>
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
                                className={`step-chip ${currentStep === i + 1 ? 'active' : ''} ${currentStep > i + 1 ? 'done' : ''} `}
                                onClick={() => setCurrentStep(i + 1)}
                            >
                                {i + 1}·{s}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="content">
                {/* ══════════════════════════════════════════
                    STEP 1 – Identificación
                ══════════════════════════════════════════ */}
                {currentStep === 1 && (
                    <div className="animate-in slide-in-from-right duration-300">
                        <div className="card">
                            <div className="card-title">Identificación del Pozo</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr', gap: '10px' }}>
                                <div className="field">
                                    <label>Pozo No.*
                                        {state.municipio !== 'MARINILLA' && (
                                            <span style={{ fontSize: '9px', color: '#64748b' }}> ({POZO_PREFIX})</span>
                                        )}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        {state.municipio !== 'MARINILLA' && (
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', fontWeight: 'bold', fontSize: '13px', fontFamily: 'DM Mono', pointerEvents: 'none' }}>{POZO_PREFIX}</span>
                                        )}
                                        <input
                                            type="text"
                                            inputMode="text"
                                            value={state.municipio === 'MARINILLA' ? state.pozo : (state.pozo.startsWith(POZO_PREFIX) ? state.pozo.slice(POZO_PREFIX.length) : state.pozo)}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                                                const isMarinilla = state.municipio === 'MARINILLA';
                                                if (isMarinilla) {
                                                    updateState({ pozo: val });
                                                } else {
                                                    updateState({ pozo: val ? POZO_PREFIX + val : '' });
                                                }
                                            }}
                                            placeholder={state.municipio === 'MARINILLA' ? 'M071' : '001'}
                                            style={{ paddingLeft: state.municipio === 'MARINILLA' ? '10px' : '26px' }}
                                        />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>ALIAS <span style={{ fontSize: '8px', color: '#64748b' }}>(Opc.)</span></label>
                                    <input
                                        type="text"
                                        value={state.alias || ''}
                                        onChange={e => updateState({ alias: e.target.value.toUpperCase() })}
                                        placeholder="PZ-01-A"
                                    />
                                </div>
                                <div className="field">
                                    <label style={{ fontSize: '10px' }}>Fecha</label>
                                    <input type="date" value={state.fecha} onChange={e => updateState({ fecha: e.target.value })} style={{ fontSize: '11px', padding: '8px 6px' }} />
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
                                <input
                                    type="number" step="0.01" value={state.altura}
                                    onFocus={numFocus}
                                    onChange={e => updateState({ altura: parseFloat(e.target.value) || 0 })}
                                    onBlur={e => { if (!e.target.value) updateState({ altura: 2.0 }); }}
                                    placeholder="2.00 m"
                                />
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-title">Sistema</div>
                            <div className="chips-big">
                                {SISTEMAS.map(s => (
                                    <div
                                        key={s}
                                        className={`chip-big ${state.sistema === s ? 'selected' : ''} `}
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
                                    toast('⚠️ Por favor completa Pozo, Barrio y Dirección.');
                                    return;
                                }
                                setCurrentStep(2);
                            }}>Siguiente <ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STEP 2 – Geometría
                ══════════════════════════════════════════ */}
                {currentStep === 2 && (
                    <div className="animate-in slide-in-from-right duration-300">
                        <div className="card">
                            <div className="card-title">Dimensiones (m)</div>
                            <div className="well-diagram">
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ flex: 1.2 }}>
                                        <WellDiagram diam={state.diam} altura={state.altura} pipes={state.pipes} />
                                    </div>
                                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.1)', borderRadius: '12px', padding: '8px' }}>
                                        <div style={{ fontSize: '7px', color: 'var(--text3)', textAlign: 'center', marginBottom: '4px', opacity: 0.6 }}>PLANTA (ESQUEMA)</div>
                                        <ManholeDiagram pozoId={state.pozo} pipes={state.pipes} isReadOnly />
                                    </div>
                                </div>
                            </div>
                            <div className="field-row">
                                <div className="field">
                                    <label>Diámetro Cuerpo <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                                    <input
                                        type="number" step="0.05" value={state.diam}
                                        onFocus={numFocus}
                                        onChange={e => updateState({ diam: parseFloat(e.target.value) || 0 })}
                                        onBlur={e => { if (!e.target.value) updateState({ diam: 0.9 }); }}
                                        placeholder="0.90 m"
                                    />
                                </div>
                                <div className="field">
                                    <label>Altura Total <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                                    <input
                                        type="number" step="0.05" value={state.altura}
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
                                    type="text" maxLength={60}
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
                                    type="text" maxLength={60}
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
                                    type="text" maxLength={100}
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
                                        toast('⚠️ Por favor, explica brevemente el motivo de la contingencia.');
                                        return;
                                    }
                                } else {
                                    if (!state.diam || state.diam <= 0 || !state.altura || state.altura <= 0) {
                                        toast('⚠️ El Diámetro y la Altura deben ser mayores a 0.');
                                        return;
                                    }
                                    if (!state.camara || (isOtroCamara && state.camara === 'OTRO')) {
                                        toast('⚠️ Selecciona o escribe un Tipo de Cámara.');
                                        return;
                                    }
                                    if (!state.rasante || (isOtroRasante && state.rasante === 'OTRO')) {
                                        toast('⚠️ Selecciona o escribe una Rasante.');
                                        return;
                                    }
                                }
                                setCurrentStep(3);
                            }}>Siguiente <ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STEP 3 – Componentes
                ══════════════════════════════════════════ */}
                {currentStep === 3 && (
                    <div className="animate-in slide-in-from-right duration-300">
                        <ComponentEditor label="Tapa" data={state.tapa} onChange={(v) => updateState({ tapa: { ...state.tapa, ...v } })} materials={['CONCRETO', 'FERROCONCRETO', 'METAL', 'PLÁSTICO REFORZADO', 'PVC', 'OTRO']} />
                        <ComponentEditor label="Cargue" data={state.cargue} onChange={(v) => updateState({ cargue: { ...state.cargue, ...v } })} materials={['CONCRETO']} />
                        <ComponentEditor label="Cuerpo" data={state.cuerpo} onChange={(v) => updateState({ cuerpo: { ...state.cuerpo, ...v } })} materials={['MAMPOSTERIA', 'CONCRETO', 'PVC', 'GRP', 'OTRO']} />
                        <ComponentEditor label="Cono" data={state.cono} onChange={(v) => updateState({ cono: { ...state.cono, ...v } })} materials={['CONCENTRICO', 'EXCENTRICO', 'OTRO']} isCono />
                        <ComponentEditor label="Cañuela" data={state.canu} onChange={(v) => updateState({ canu: { ...state.canu, ...v } })} materials={['MAMPOSTERIA', 'CONCRETO', 'PVC', 'OTRO']} />
                        <ComponentEditor label="Peldaños" data={state.peld} onChange={(v) => updateState({ peld: { ...state.peld, ...v } })} materials={['METAL', 'PLÁSTICO REFORZADO', 'NO_TIENE']} />
                        <div className="btn-row">
                            <button className="btn btn-ghost" onClick={() => setCurrentStep(2)}><ChevronLeft size={16} /> Volver</button>
                            <button className="btn btn-green" onClick={() => setCurrentStep(4)}>Siguiente <ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STEP 4 – Tuberías & Sumideros
                ══════════════════════════════════════════ */}
                {currentStep === 4 && (
                    <div className="animate-in slide-in-from-right duration-300">
                        <div className="card">
                            <div className="card-title">Esquema de Tuberías (E1-7 / S1-2)</div>
                            <div className="p-2">
                                <ManholeDiagram
                                    pozoId={state.pozo || 'S/N'}
                                    pipes={state.pipes}
                                    onPipesChange={(newPipes) => updateState({ pipes: newPipes })}
                                />
                            </div>
                        </div>

                        <div className="card mt-4">
                            <div className="card-title">Datos Generales</div>
                            <div className="field">
                                <label>Pendiente (%) General</label>
                                <input
                                    type="number" step="0.1" value={state.pendiente}
                                    onChange={e => updateState({ pendiente: e.target.value })}
                                    placeholder="0.0"
                                    className="bg-gray-800 text-yellow-400 font-mono text-center"
                                />
                            </div>
                        </div>

                        {(() => {
                            const alerts: string[] = [];
                            const hTotal = state.altura || 0;
                            state.pipes.forEach((p, idx) => {
                                const z = parseFloat(p.cotaZ) || 0;
                                let d = parseFloat(p.diam) || 0;
                                if (p.unit === 'in') d = (d * 25.4);
                                const batea = z + (d / 1000);
                                if (p.es === 'ENTRADA' && hTotal < batea) alerts.push(`Tubería #${idx + 1} (ENTRADA): Altura total (${hTotal}m) debe ser ≥ Batea (${batea.toFixed(3)}m)`);
                                if (p.es === 'SALIDA' && hTotal < batea) alerts.push(`Tubería #${idx + 1} (SALIDA): Altura total (${hTotal}m) debe ser ≥ Batea (${batea.toFixed(3)}m)`);
                            });
                            if (alerts.length > 0) {
                                return (
                                    <div className="card mt-4 border-red-500/50 bg-red-500/10 animate-pulse">
                                        <div className="card-title text-red-500 flex items-center gap-2"><AlertTriangle size={16} /> Alertas de Alturas</div>
                                        <div className="p-2 space-y-1">
                                            {alerts.map((a, i) => <div key={i} className="text-[11px] text-red-400 font-bold">• {a}</div>)}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="card mt-4">
                            <div className="card-title">Resumen de Ramales</div>
                            <div className="space-y-3">
                                {state.pipes.length === 0 ? (
                                    <div className="text-center py-6 opacity-40 italic text-xs">No hay ramales configurados. Toca el diagrama arriba para agregar.</div>
                                ) : (
                                    state.pipes.map((p, idx) => (
                                        <PipeCard
                                            key={p.id}
                                            pipe={p}
                                            index={idx}
                                            onUpdate={(upd) => {
                                                const newPipes = [...state.pipes];
                                                newPipes[idx] = { ...p, ...upd };
                                                updateState({ pipes: newPipes });
                                            }}
                                            onDelete={() => updateState({ pipes: state.pipes.filter((_, i) => i !== idx) })}
                                            numFocus={() => {}}
                                        />
                                    ))
                                )}
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
                                        onDelete={() => updateState({ sums: state.sums.filter((_, i) => i !== idx) })}
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

                {/* ══════════════════════════════════════════
                    STEP 5 – Fotos & Observaciones
                ══════════════════════════════════════════ */}
                {currentStep === 5 && (
                    <div className="animate-in slide-in-from-right duration-300">
                        <div className="card mb-2" style={{ padding: '8px', background: 'var(--bg2)' }}>
                            <div className="flex justify-between items-center mb-1">
                                <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Esquema de Referencia</span>
                                <span style={{ fontSize: '8px', color: 'var(--blue)' }}>{state.pipes.length} Ramales</span>
                            </div>
                            <div style={{ height: '140px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <div style={{ transform: 'scale(0.55)', transformOrigin: 'center' }}>
                                    <ManholeDiagram pozoId={state.pozo} pipes={state.pipes} isReadOnly />
                                </div>
                            </div>
                        </div>
                        <div className="p-2">
                            <FotosZone
                                pozoId={state.pozo || 'P000'}
                                photos={state.fotoList}
                                pipes={state.pipes}
                                sums={state.sums}
                                onAddPhoto={(foto: FotoRegistro) => updateState({ fotoList: [...state.fotoList, foto] })}
                                onDeletePhoto={(id: string) => updateState({ fotoList: state.fotoList.filter(f => f.id !== id) })}
                            />
                        </div>

                        <div className="card">
                            <div className="card-title">Observaciones y Cierre</div>
                            <div className="field">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="mb-0">Observaciones</label>
                                    <button
                                        className="bg-white/5 hover:bg-white/10 text-[10px] py-1 px-2 rounded-md flex items-center gap-1 transition-all"
                                        onClick={() => {
                                            const bullet = '• ';
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
                                                e.preventDefault();
                                                updateState({ obs: state.obs + '\n• ' });
                                            }
                                        }
                                    }}
                                    rows={6}
                                    placeholder="Ej: • Tapa fisurada..."
                                />
                            </div>
                        </div>

                        <div className="btn-row">
                            <button className="btn btn-ghost" onClick={() => setCurrentStep(4)}><ChevronLeft size={16} /> Volver</button>
                            <button className="btn btn-green" onClick={() => {
                                const totalH = Number(state.altura);
                                if (!isNaN(totalH) && state.pipes.length > 0) {
                                    const warnings: string[] = [];
                                    for (const p of state.pipes) {
                                        const z = parseFloat(p.cotaZ) || 0;
                                        let d = parseFloat(p.diam) || 0;
                                        if (p.unit === 'in') d = (d * 25.4);
                                        const bateaVal = z + (d / 1000);
                                        if (totalH < bateaVal) warnings.push(`⚠️ ${p.es}: Altura (${totalH}m) < Batea (${bateaVal.toFixed(3)}m)`);
                                    }
                                    if (warnings.length > 0) toast(warnings.join(' | '));
                                }
                                setCurrentStep(6);
                            }}>Finalizar <Check size={16} /></button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STEP 6 – Resumen & Guardado
                ══════════════════════════════════════════ */}
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
                            <SummaryItem label="Pendiente Gral." val={state.pendiente || 'No registrada'} />
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
                                <button className="btn btn-orange" onClick={() => handlePDF()} disabled={pdfLoading}>
                                    {pdfLoading ? <span className="spinner-white mr-2"></span> : <FileText size={14} />}
                                    {pdfLoading ? 'GENERANDO...' : 'PDF Ficha'}
                                </button>
                            </div>
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

export default FormPage;
