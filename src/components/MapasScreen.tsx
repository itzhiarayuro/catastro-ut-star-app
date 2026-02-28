import React, { useState, useEffect } from 'react';
import {
    Map,
    AdvancedMarker,
    InfoWindow,
    MapControl,
    ControlPosition,
    useMap
} from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    Maximize2,
    Minimize2,
    Navigation,
    Layers,
    Search,
    Info,
    MapPin,
    Wifi,
    ChevronLeft
} from 'lucide-react';

// Estilo Premium Dark para Google Maps
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_ID; // ID de estilo personalizado (opcional)

interface FichaMapItem {
    id: string;
    pozo: string;
    municipio: string;
    sistema: string;
    gps: {
        lat: number;
        lng: number;
    };
    direccion: string;
    fullData: any;
}

const MapasScreen: React.FC<{
    onEditFicha?: (ficha: any) => void;
    onBack?: () => void;
}> = ({ onEditFicha, onBack }) => {
    const map = useMap();
    const [fichas, setFichas] = useState<FichaMapItem[]>([]);
    const [selectedFicha, setSelectedFicha] = useState<FichaMapItem | null>(null);
    const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid');
    const [center, setCenter] = useState({ lat: 6.244, lng: -75.581 }); // Un centro más neutro si falla (Medellín)
    const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [initialCenterDone, setInitialCenterDone] = useState(false);

    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'fichas'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const lat = data.gps?.lat || data.header?.gps?.lat;
                    const lng = data.gps?.lng || data.header?.gps?.lng;

                    if (!lat || !lng) return null;

                    return {
                        id: doc.id,
                        pozo: data.pozo || data.header?.pozoNo || 'S/N',
                        municipio: data.municipio || data.header?.municipio || 'DESCONOCIDO',
                        sistema: data.sistema || 'DESCONOCIDO',
                        gps: { lat, lng },
                        direccion: data.direccion || '',
                        fullData: data
                    };
                })
                .filter(item => item !== null) as FichaMapItem[];

            setFichas(items);
            if (items.length > 0 && !userPos && !initialCenterDone) {
                setCenter(items[0].gps);
            }
        });

        // Eliminamos el inicio automático del GPS para evitar la violación de "User Gesture"
        /*
        let watchId: number;
        if ("geolocation" in navigator) {
            setIsLocating(true);
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserPos(newPos);
                    setIsLocating(false);
                    if (!initialCenterDone) {
                        setCenter(newPos);
                        setInitialCenterDone(true);
                    }
                },
                (err) => {
                    console.error("Error obteniendo ubicación:", err);
                    setIsLocating(false);
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
            );
        }
        */

        // Forzar renderizado
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            setMapReady(true);
        }, 1500);

        return () => {
            unsubscribe();
            // if (watchId) navigator.geolocation.clearWatch(watchId);
            clearTimeout(timer);
        };
    }, [initialCenterDone]);

    // Efecto para centrar cuando el mapa esté listo
    useEffect(() => {
        if (map && userPos && !initialCenterDone) {
            map.panTo(userPos);
            map.setZoom(18);
            setInitialCenterDone(true);
        }
    }, [map, userPos, initialCenterDone]);

    const handleCenterMap = () => {
        if (userPos && map) {
            map.panTo(userPos);
            map.setZoom(18);
        } else {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserPos(newPos);
                    if (map) {
                        map.panTo(newPos);
                        map.setZoom(18);
                    }
                    setIsLocating(false);
                },
                () => setIsLocating(false),
                { enableHighAccuracy: true }
            );
        }
    };

    const getPinColor = (sistema: string) => {
        switch (sistema) {
            case 'PLUVIAL': return '#3b82f6';
            case 'RESIDUAL': return '#64748b';
            case 'COMBINADO': return '#a855f7';
            case 'OCULTO': return '#f59e0b';
            default: return '#ef4444';
        }
    };

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '60px', zIndex: 1000, background: '#010409' }}>

            {/* Header del Mapa */}
            <div className="absolute top-4 left-4 right-4 z-[1010] flex flex-col gap-2">
                <div className="flex items-center justify-between bg-[#161b22]/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <MapPin className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-white text-sm font-bold tracking-tight">Mapa Georeferenciado</h2>
                            <p className="text-[10px] text-gray-500 uppercase font-black flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                {fichas.length} Puntos en tiempo real
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMapType(mapType === 'hybrid' ? 'roadmap' : 'hybrid')}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors shadow-lg"
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Google Maps Container - posición absoluta para cubrir todo */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Map
                    center={center}
                    onCenterChanged={(ev) => setCenter(ev.detail.center)}
                    onTilesLoaded={() => setMapReady(true)}
                    defaultZoom={15}
                    mapId={MAP_ID}
                    mapTypeId={mapType}
                    disableDefaultUI={true}
                    gestureHandling={'greedy'}
                    style={{ width: '100%', height: '100%' }}
                >
                    {/* Marcador de Ubicación del Usuario (Punto Azul) */}
                    {userPos && (
                        <AdvancedMarker position={userPos}>
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-ping border border-blue-500/50"></div>
                                <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,132,255,1)]"></div>
                            </div>
                        </AdvancedMarker>
                    )}

                    {fichas.map(ficha => (
                        <AdvancedMarker
                            key={ficha.id}
                            position={ficha.gps}
                            onClick={() => setSelectedFicha(ficha)}
                        >
                            {/* Custom pin marker - avoids deprecated <gmp-pin> element warning */}
                            <div
                                style={{
                                    width: '30px',
                                    height: '42px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                                    transform: 'translate(0, -50%)'
                                }}
                            >
                                {/* Pin body (SVG) */}
                                <svg viewBox="0 0 30 42" width="30" height="42" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z"
                                        fill={getPinColor(ficha.sistema)}
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                    />
                                    <circle cx="15" cy="14" r="6" fill="#ffffff" opacity="0.9" />
                                </svg>
                            </div>
                        </AdvancedMarker>
                    ))}

                    {selectedFicha && (
                        <InfoWindow
                            position={selectedFicha.gps}
                            onCloseClick={() => setSelectedFicha(null)}
                        >
                            <div className="p-2 min-w-[200px] text-black">
                                <h3 className="font-bold text-sm border-b pb-1 mb-2 text-blue-600">Pozo: {selectedFicha.pozo}</h3>
                                <div className="space-y-1 text-xs">
                                    <p><strong>Municipio: </strong> {selectedFicha.municipio}</p>
                                    <p><strong>Sistema: </strong> {selectedFicha.sistema}</p>
                                    <p><strong>Ubicación: </strong> {selectedFicha.direccion || 'No registrada'}</p>
                                    <div className="mt-3 pt-2 border-t flex justify-between items-center">
                                        <span className="text-[10px] font-mono opacity-60">{selectedFicha.gps.lat.toFixed(6)}, {selectedFicha.gps.lng.toFixed(6)}</span>
                                        <button
                                            className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                                            onClick={() => {
                                                if (onEditFicha) onEditFicha(selectedFicha.fullData);
                                            }}
                                        >
                                            EDITAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </InfoWindow>
                    )}

                    {/* Controles del Mapa flotantes - DENTRO del Map */}
                    <MapControl position={ControlPosition.RIGHT_CENTER}>
                        <div className="flex flex-col gap-3 mr-4">
                            <button
                                onClick={handleCenterMap}
                                className={`p-4 rounded-full bg-blue-600 border border-blue-400 shadow-2xl text-white hover:bg-blue-500 active:scale-90 transition-all ${isLocating ? 'scale-110 rotate-45' : ''}`}
                            >
                                <Navigation className={`w-6 h-6 ${isLocating ? 'animate-pulse' : ''}`} />
                            </button>
                        </div>
                    </MapControl>
                </Map>
            </div>

            {/* Estadísticas Rápidas Footer */}
            {!selectedFicha && (
                <div className="absolute bottom-4 left-4 right-4 z-[1010]">
                    <div className="grid grid-cols-3 gap-2 bg-[#161b22]/90 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-2xl">
                        <div className="bg-blue-500/10 rounded-xl p-2 border border-blue-500/20 text-center">
                            <p className="text-[8px] text-blue-400 uppercase font-black">Pluvial</p>
                            <p className="text-sm font-black text-white">{fichas.filter(f => f.sistema === 'PLUVIAL').length}</p>
                        </div>
                        <div className="bg-slate-500/10 rounded-xl p-2 border border-slate-500/20 text-center">
                            <p className="text-[8px] text-slate-400 uppercase font-black">Residual</p>
                            <p className="text-sm font-black text-white">{fichas.filter(f => f.sistema === 'RESIDUAL').length}</p>
                        </div>
                        <div className="bg-purple-500/10 rounded-xl p-2 border border-purple-500/20 text-center">
                            <p className="text-[8px] text-purple-400 uppercase font-black">Otros</p>
                            <p className="text-sm font-black text-white">{fichas.filter(f => !['PLUVIAL', 'RESIDUAL'].includes(f.sistema)).length}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapasScreen;
