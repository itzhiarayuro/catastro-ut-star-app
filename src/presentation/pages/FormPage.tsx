import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Check, RefreshCw,
    Navigation, Globe, Save,
    FileJson, FileText, Download, Trash2
} from 'lucide-react';
import { PdfFastButton } from '../../hooks/usePdfExportFast';
import { Crosshair, LocateFixed, Signal, AlertTriangle, Plus, ClipboardPaste } from 'lucide-react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';

import { useAppStore } from '../../hooks/useAppStore';
import { saveMunicipioCache } from '../../utils/ui';
import {
    AppState, SISTEMAS, RASANTES, ESTADOS_POZO,
    TIPOS_CAMARA, MUNICIPIOS
} from '../../types/catastro';
import { FotoRegistro } from '../../utils/fotoProcessor';
import ManholeDiagram from '../../components/ManholeDiagram';
import WellDiagram from '../components/WellDiagram';
import ComponentEditor from '../components/ComponentEditor';
import { getHybridModeStatus } from '../../utils/storageManager';
import { TuberiasSection } from '../components/TuberiasSection';
import { FotosSection } from '../components/FotosSection';
import { parseCoordinates } from '../../utils/coordinates';

const POZO_PREFIX = 'PZ';

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

    const [previewPhoto, setPreviewPhoto] = useState<FotoRegistro | null>(null);
    const [storageInfo, setStorageInfo] = useState({ mode: 'FULL', info: '' });
    const [showManualCoordinates, setShowManualCoordinates] = useState(false);
    const [manualCoordinates, setManualCoordinates] = useState('');

    useEffect(() => {
        getHybridModeStatus(state.fotoList.length).then(setStorageInfo);
    }, [state.fotoList.length]);

    const isLocked = storageInfo.mode === 'LOCKED';

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

    const applyManualCoordinates = () => {
        try {
            const coordinates = parseCoordinates(manualCoordinates);
            updateState({ gps: { ...coordinates, precision: null } });
            setShowManualCoordinates(false);
            toast('✅ Coordenadas aplicadas al mapa y a la ficha');
        } catch {
            toast('❌ Coordenadas inválidas. Se conservó la ubicación anterior');
        }
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

                        {/* ── Municipio de Trabajo (PRIMER CAMPO) ── */}
                        <div className="card" style={{ borderColor: state.municipio ? 'rgba(59,130,246,0.5)' : 'rgba(255,69,96,0.4)', borderWidth: '1.5px' }}>
                            <div className="card-title" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📍 Municipio de Trabajo
                                {state.municipio && (
                                    <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: '6px', padding: '2px 8px', fontWeight: '700' }}>
                                        {state.municipio}
                                    </span>
                                )}
                            </div>
                            <div className="chips">
                                {MUNICIPIOS.map(m => (
                                    <div
                                        key={m}
                                        className={`chip ${state.municipio === m ? 'selected' : ''}`}
                                        onClick={() => {
                                            updateState({ municipio: m });
                                            saveMunicipioCache(m);
                                        }}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>
                        </div>

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
                                            value={state.municipio === 'MARINILLA' ? state.pozo : (state.pozo.startsWith(POZO_PREFIX) ? state.pozo.slice(POZO_PREFIX.length) : (state.pozo.startsWith('P') ? state.pozo.slice(1) : state.pozo))}
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
                                            style={{ paddingLeft: state.municipio === 'MARINILLA' ? '10px' : '34px' }}
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
                                <select 
                                    value={ESTADOS_POZO.includes(state.estadoPozo || '') ? state.estadoPozo : 'OTRO'} 
                                    onChange={e => updateState({ estadoPozo: e.target.value })}
                                >
                                    {ESTADOS_POZO.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                {((state.estadoPozo && !ESTADOS_POZO.includes(state.estadoPozo)) || state.estadoPozo === 'OTRO') && (
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={state.estadoPozo === 'OTRO' ? '' : state.estadoPozo}
                                        onChange={e => updateState({ estadoPozo: e.target.value.toUpperCase() })}
                                        style={{ marginTop: '10px' }}
                                        placeholder="Especifique estado del pozo..."
                                    />
                                )}
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
                                    onFocus={e => e.target.select()}
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
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button type="button" className="btn btn-blue btn-full btn-sm" style={{ flex: '1 1 140px' }} onClick={captureGPS}>
                                        <Navigation size={14} /> Capturar GPS
                                    </button>
                                    <button type="button" className="btn btn-blue btn-full btn-sm" style={{ flex: '1 1 140px' }} onClick={() => setShowManualCoordinates(value => !value)}>
                                        <ClipboardPaste size={14} /> Pegar coordenadas
                                    </button>
                                    <button type="button" className="btn btn-blue btn-full btn-sm" style={{ flex: '1 1 140px', backgroundColor: '#0066FF' }} onClick={() => setShowGeoTracker(true)}>
                                        <Crosshair size={14} /> Punto Exacto
                                    </button>
                                </div>
                                {showManualCoordinates && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <input
                                            aria-label="Coordenadas manuales"
                                            style={{ flex: '1 1 220px' }}
                                            value={manualCoordinates}
                                            onChange={event => setManualCoordinates(event.target.value)}
                                            placeholder={`4°43'39.6"N, 74°26'52.5"W`}
                                        />
                                        <button type="button" className="btn btn-blue btn-sm" onClick={applyManualCoordinates}>Ubicar en el mapa</button>
                                    </div>
                                )}
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
                                                    {state.gps.precision == null ? 'Coordenadas manuales' : `Precisión: ${state.gps.precision.toFixed(1)} m`}
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
                                        onFocus={e => e.target.select()}
                                        onChange={e => updateState({ diam: parseFloat(e.target.value) || 0 })}
                                        onBlur={e => { if (!e.target.value) updateState({ diam: 0.9 }); }}
                                        placeholder="0.90 m"
                                    />
                                </div>
                                <div className="field">
                                    <label>Altura Total <span style={{ fontSize: '9px', color: '#64748b' }}>m</span></label>
                                    <input
                                        type="number" step="0.05" value={state.altura}
                                        onFocus={e => e.target.select()}
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
                        <ComponentEditor label="Cono" data={state.cono} onChange={(v) => updateState({ cono: { ...state.cono, ...v } })} materials={['MAMPOSTERIA', 'PVC', 'CONCRETO', 'GRP', 'OTRO']} isCono />
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
                    <TuberiasSection
                        pipes={state.pipes}
                        sums={state.sums}
                        pozo={state.pozo}
                        municipio={state.municipio}
                        fotoList={state.fotoList}
                        pendiente={state.pendiente}
                        altura={state.altura}
                        isLocked={isLocked}
                        updateState={updateState}
                        setCurrentStep={setCurrentStep}
                        setPreviewPhoto={setPreviewPhoto}
                    />
                )}

                {/* ══════════════════════════════════════════
                    STEP 5 – Fotos & Observaciones
                ══════════════════════════════════════════ */}
                {currentStep === 5 && (
                    <FotosSection
                        pipes={state.pipes}
                        sums={state.sums}
                        pozo={state.pozo}
                        municipio={state.municipio}
                        fotoList={state.fotoList}
                        obs={state.obs}
                        altura={state.altura}
                        estadoPozo={state.estadoPozo}
                        updateState={updateState}
                        setCurrentStep={setCurrentStep}
                        toast={toast}
                    />
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
                            <PdfFastButton pozo={state} toast={toast} className="btn btn-full" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }} />
                            <button className="btn btn-ghost btn-full" onClick={startNewFicha}>
                                <Plus size={16} /> Nueva Ficha
                            </button>
                        </div>
                    </div>
                )}
                {/* Modal Previsualización */}
                {previewPhoto && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column', padding: '16px' }}
                        onClick={() => setPreviewPhoto(null)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ color: 'white', fontWeight: '700', fontSize: '13px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{previewPhoto.filename}</span>
                            <button style={{ background: '#da3633', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', marginLeft: '12px' }}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    updateState({ fotoList: state.fotoList.filter(f => f.id !== previewPhoto.id) });
                                    setPreviewPhoto(null); 
                                }}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <img src={previewPhoto.blobId} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Preview" />
                        </div>
                        <p style={{ textAlign: 'center', color: '#555', fontSize: '10px', marginTop: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>Toca para cerrar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormPage;
