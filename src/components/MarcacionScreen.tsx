import React, { useState, useEffect } from 'react';
import { Camera, MapPin, ChevronLeft, Save, Trash2, CheckCircle2, AlertTriangle, Image as ImageIcon, Search } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { procesarFoto, FotoRegistro, resizeImage } from '../utils/fotoProcessor';
import { savePhotoToStorage } from '../utils/storageManager';
import GeoTracker from './GeoTracker';

interface MarcacionState {
    id: string;
    tipoElemento: string;
    otroTipo: string;
    municipio: string;
    gps: { lat: number | null, lng: number | null, precision: number | null };
    fotos: {
        panoramica: FotoRegistro | null;
        tapa: FotoRegistro | null;
    };
    inspector: string;
    createdAt: string;
}

const MarcacionScreen: React.FC<{
    user: any;
    onBack: () => void;
    onSuccess: (msg: string) => void;
}> = ({ user, onBack, onSuccess }) => {
    const [state, setState] = useState<MarcacionState>({
        id: `M_${Date.now()}`,
        tipoElemento: 'pozo de inspección',
        otroTipo: '',
        municipio: (window as any).CURRENT_MUNICIPIO || 'Sopó',
        gps: { lat: null, lng: null, precision: null },
        fotos: { panoramica: null, tapa: null },
        inspector: user?.name || 'Desconocido',
        createdAt: new Date().toISOString()
    });

    const [showGeoTracker, setShowGeoTracker] = useState(false);
    const [loading, setLoading] = useState(false);

    const tipos = [
        'pozo de inspección',
        'aliviadero',
        'descarga',
        'caja de inspección',
        'sumidero',
        'OTRO'
    ];

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, category: 'panoramica' | 'tapa') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const base64 = await resizeImage(file, 1600, 1600, 0.7);
            const prefix = category === 'panoramica' ? 'P' : 'T';
            const filename = `M_${state.id.split('_')[1]}-${prefix}.JPG`;

            const newFoto = procesarFoto(filename, state.id, base64);

            // Save to local storage for background sync
            await savePhotoToStorage({
                id: newFoto.id,
                pozoId: state.id,
                municipio: state.municipio,
                barrio: 'MARCACION',
                filename: filename,
                blob: base64,
                categoria: category === 'panoramica' ? 'General' : 'Interior',
                inspector: state.inspector,
                timestamp: Date.now(),
                synced: false
            });

            setState(prev => ({
                ...prev,
                fotos: {
                    ...prev.fotos,
                    [category]: { ...newFoto, blobId: base64 }
                }
            }));
        } catch (err) {
            console.error("Error capturando foto:", err);
            alert("Error al procesar la foto.");
        }
    };

    const handleSave = async () => {
        if (!state.gps.lat) {
            alert("⚠️ Debes capturar la ubicación GPS.");
            return;
        }
        if (!state.fotos.panoramica || !state.fotos.tapa) {
            alert("⚠️ Se requieren ambas fotos (Panorámica y Tapa).");
            return;
        }

        setLoading(true);
        try {
            const finalType = state.tipoElemento === 'OTRO' ? state.otroTipo : state.tipoElemento;
            const dataToSave = {
                ...state,
                tipoElemento: finalType,
                synced: navigator.onLine,
                lastSync: new Date().toISOString()
            };

            // Save to Firestore if online
            if (navigator.onLine) {
                const path = `marcaciones/${state.municipio.toUpperCase()}_${state.id}`;
                await setDoc(doc(db, path), dataToSave);
            }

            // Save locally for history
            const existing = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
            existing.push(dataToSave);
            localStorage.setItem('marcaciones_star', JSON.stringify(existing));

            onSuccess("✅ Marcación guardada correctamente");
            onBack();
        } catch (err) {
            console.error("Error guardando marcación:", err);
            alert("Error al guardar. Se intentará sincronizar después.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="screen active">
            {/* Header */}
            <header className="app-header">
                <div className="header-inner">
                    <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
                        <ChevronLeft size={24} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Actividad Marcación</div>
                        <div className="header-sub" style={{ color: 'var(--blue)' }}>Localización Rápida</div>
                    </div>
                </div>
            </header>

            <div className="content">
                {/* Botón Akaso Superior */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button
                        onClick={() => {
                            const intent = "intent://#Intent;scheme=akasoGo;package=com.akaso.go;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.akaso.go;end";
                            window.location.href = intent;
                        }}
                        className="btn btn-orange btn-sm"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                    >
                        <Camera size={14} /> Akaso GO
                    </button>
                </div>

                <div className="card">
                    <div className="card-title">Tipo de Elemento</div>
                    <div className="chips-big">
                        {tipos.map(t => (
                            <div
                                key={t}
                                onClick={() => setState(prev => ({ ...prev, tipoElemento: t }))}
                                className={`chip-big ${state.tipoElemento === t ? 'selected' : ''}`}
                            >
                                {t === 'OTRO' ? 'OTRO...' : t.toUpperCase()}
                            </div>
                        ))}
                    </div>
                    {state.tipoElemento === 'OTRO' && (
                        <div className="field" style={{ marginTop: '12px' }}>
                            <input
                                type="text"
                                placeholder="Especificar tipo..."
                                value={state.otroTipo}
                                onChange={e => setState(prev => ({ ...prev, otroTipo: e.target.value }))}
                            />
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-title" style={{ color: 'var(--green)' }}>
                        <MapPin size={16} /> Georreferenciación
                    </div>

                    <button
                        className={`btn btn-full ${state.gps.lat ? 'btn-ghost' : 'btn-blue'}`}
                        onClick={() => setShowGeoTracker(true)}
                        style={state.gps.lat ? { borderColor: 'var(--green)', color: 'var(--green)' } : {}}
                    >
                        <MapPin size={18} />
                        {state.gps.lat ? 'Modificar Ubicación' : 'Capturar GPS en Mapa'}
                    </button>

                    {state.gps.lat && (
                        <div className="gps-result show" style={{ textAlign: 'center', margin: '12px auto 0' }}>
                            <div style={{ fontSize: '14px', color: '#fff', marginBottom: '4px' }}>
                                {state.gps.lat.toFixed(6)}, {state.gps.lng?.toFixed(6)}
                            </div>
                            <div>Precisión: ±{state.gps.precision}m</div>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-title">Evidencia Fotográfica</div>
                    <div className="field-row">
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>Panorámica</div>
                            <div className="photo-zone" style={{ height: '120px' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handlePhoto(e, 'panoramica')}
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                />
                                {state.fotos.panoramica ? (
                                    <img src={state.fotos.panoramica.blobId} alt="Panorámica" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                ) : (
                                    <>
                                        <div className="pz-icon"><Camera size={24} /></div>
                                        <div className="pz-label">Tocar</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>F. Tapa</div>
                            <div className="photo-zone" style={{ height: '120px' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handlePhoto(e, 'tapa')}
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                />
                                {state.fotos.tapa ? (
                                    <img src={state.fotos.tapa.blobId} alt="Tapa" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                ) : (
                                    <>
                                        <div className="pz-icon"><Camera size={24} /></div>
                                        <div className="pz-label">Tocar</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-green btn-full"
                    onClick={handleSave}
                    disabled={loading}
                    style={{ marginTop: '20px', marginBottom: '20px' }}
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-black" style={{ display: 'inline-block' }}></div>
                    ) : (
                        <>
                            <Save size={18} /> Guardar Marcación
                        </>
                    )}
                </button>
            </div>

            {/* Modals */}
            {showGeoTracker && (
                <GeoTracker
                    initialCoords={{ lat: state.gps.lat || 4.908, lng: state.gps.lng || -73.948 }}
                    pozoId={state.id}
                    onClose={() => setShowGeoTracker(false)}
                    onConfirm={(c) => {
                        setState(prev => ({ ...prev, gps: c }));
                        setShowGeoTracker(false);
                    }}
                    onScreenshot={async (foto) => {
                        // Guardar en marcación local
                        setState(prev => ({
                            ...prev,
                            fotos: {
                                ...prev.fotos,
                                ug: foto // Agregamos campo de ubicación general
                            }
                        }));
                        // También guardar en storage para sync de fondo
                        await savePhotoToStorage({
                            id: foto.id,
                            pozoId: state.id,
                            municipio: state.municipio,
                            barrio: 'MARCACION',
                            filename: foto.filename,
                            blob: foto.blobId,
                            categoria: 'General',
                            inspector: state.inspector,
                            timestamp: Date.now(),
                            synced: false
                        });
                    }}
                />
            )}
        </div>
    );
};

export default MarcacionScreen;
