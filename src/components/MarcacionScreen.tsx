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
        <div className="flex flex-col h-full bg-[#020617] text-white font-inter">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0f172a]/50 backdrop-blur-md">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-lg font-bold">Actividad Marcación</h1>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Localización Rápida</p>
                </div>
                <button
                    onClick={() => {
                        const intent = "intent://#Intent;scheme=akasoGo;package=com.akaso.go;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.akaso.go;end";
                        window.location.href = intent;
                    }}
                    className="ml-auto flex items-center gap-2 bg-[#FF5722] hover:bg-[#E64A19] text-white text-[10px] font-bold py-1.5 px-3 rounded-full transition-all shadow-lg active:scale-95"
                >
                    <Camera size={14} />
                    Akaso GO
                </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Tipo de Elemento */}
                <div className="space-y-3">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tipo de Elemento</label>
                    <div className="grid grid-cols-2 gap-2">
                        {tipos.map(t => (
                            <button
                                key={t}
                                onClick={() => setState(prev => ({ ...prev, tipoElemento: t }))}
                                className={`p-3 rounded-xl border text-xs font-bold transition-all ${state.tipoElemento === t
                                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20'
                                    : 'bg-[#1e293b]/50 border-white/5 text-gray-400'
                                    }`}
                            >
                                {t === 'OTRO' ? 'OTRO...' : t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {state.tipoElemento === 'OTRO' && (
                        <input
                            type="text"
                            placeholder="Especificar tipo..."
                            className="w-full bg-[#0d1117] border border-blue-500/30 rounded-xl p-4 text-sm text-white focus:border-blue-500 transition-all"
                            value={state.otroTipo}
                            onChange={e => setState(prev => ({ ...prev, otroTipo: e.target.value }))}
                        />
                    )}
                </div>

                {/* GPS Section */}
                <div className="space-y-3">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Georreferenciación</label>
                    <div
                        className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${state.gps.lat ? 'bg-green-500/5 border-green-500/20' : 'bg-blue-500/5 border-blue-500/20'
                            }`}
                        onClick={() => setShowGeoTracker(true)}
                    >
                        <MapPin size={32} className={state.gps.lat ? 'text-green-500' : 'text-blue-500'} />
                        <div className="text-center">
                            {state.gps.lat ? (
                                <>
                                    <div className="text-sm font-bold text-white">{state.gps.lat.toFixed(7)}, {state.gps.lng?.toFixed(7)}</div>
                                    <div className="text-[10px] text-green-500 font-black uppercase mt-1 tracking-widest">Precisión: ±{state.gps.precision}m</div>
                                </>
                            ) : (
                                <>
                                    <div className="text-sm font-bold text-white">Capturar Ubicación</div>
                                    <div className="text-[10px] text-blue-400 font-black uppercase mt-1 tracking-widest">Toca para abrir mapas</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Photo Section */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Panorámica */}
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Panorámica</label>
                        <div className="relative aspect-square rounded-2xl bg-[#1e293b]/50 border border-white/5 overflow-hidden flex items-center justify-center group">
                            {state.fotos.panoramica ? (
                                <img src={state.fotos.panoramica.blobId} className="w-full h-full object-cover" alt="Panorámica" />
                            ) : (
                                <Camera size={32} className="text-gray-600" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => handlePhoto(e, 'panoramica')}
                            />
                            {state.fotos.panoramica && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImageIcon size={24} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tapa */}
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">F. Tapa</label>
                        <div className="relative aspect-square rounded-2xl bg-[#1e293b]/50 border border-white/5 overflow-hidden flex items-center justify-center group">
                            {state.fotos.tapa ? (
                                <img src={state.fotos.tapa.blobId} className="w-full h-full object-cover" alt="Tapa" />
                            ) : (
                                <Camera size={32} className="text-gray-600" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => handlePhoto(e, 'tapa')}
                            />
                            {state.fotos.tapa && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImageIcon size={24} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0f172a]/80 backdrop-blur-md">
                <button
                    className={`btn-primary btn-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${loading ? 'opacity-50' : 'active:scale-95'
                        }`}
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                    ) : (
                        <>
                            <Save size={18} />
                            Guardar Marcación
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
