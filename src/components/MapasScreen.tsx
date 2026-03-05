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
    ChevronLeft,
    Download
} from 'lucide-react';
import { BingLayer } from './BingLayer';
import OfflineMapManager from './OfflineMapManager';

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
    const [marcaciones, setMarcaciones] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'investigacion' | 'marcacion'>('investigacion');
    const [selectedFicha, setSelectedFicha] = useState<FichaMapItem | null>(null);
    const [mapType, setMapType] = useState<'hybrid' | 'roadmap' | 'bing' | 'osm'>('hybrid');
    const [zoom, setZoom] = useState(15);
    const [center, setCenter] = useState({ lat: 6.244, lng: -75.581 });
    const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [initialCenterDone, setInitialCenterDone] = useState(false);
    const [showOfflineManager, setShowOfflineManager] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    // Simple OSM Layer using Native Google Maps TileLayer
    const OSMLayer = ({ active }: { active: boolean }) => {
        const map = useMap();
        useEffect(() => {
            if (!map) return;
            const osmMapType = new google.maps.ImageMapType({
                getTileUrl: (coord, zoom) => `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`,
                tileSize: new google.maps.Size(256, 256),
                name: 'OpenStreetMap',
                maxZoom: 19
            });
            if (active) {
                map.overlayMapTypes.insertAt(0, osmMapType);
            } else {
                map.overlayMapTypes.forEach((mt, i) => {
                    if (mt?.name === 'OpenStreetMap') map.overlayMapTypes.removeAt(i);
                });
            }
            return () => {
                map.overlayMapTypes.forEach((mt, i) => {
                    if (mt?.name === 'OpenStreetMap') map.overlayMapTypes.removeAt(i);
                });
            };
        }, [map, active]);
        return null;
    };

    useEffect(() => {
        // Fetch Fichas
        const qFichas = query(collection(db, 'fichas'));
        const unsubFichas = onSnapshot(qFichas, (snapshot) => {
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

        // Fetch Marcaciones
        const qMarc = query(collection(db, 'marcaciones'));
        const unsubMarc = onSnapshot(qMarc, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMarcaciones(items);
        });

        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            setMapReady(true);
        }, 1500);

        return () => {
            unsubFichas();
            unsubMarc();
            clearTimeout(timer);
        };
    }, [initialCenterDone]);

    useEffect(() => {
        if (map && userPos && !initialCenterDone) {
            map.panTo(userPos);
            setZoom(18);
            setInitialCenterDone(true);
        }
    }, [map, userPos, initialCenterDone]);

    const handleCenterMap = () => {
        if (userPos && map) {
            map.panTo(userPos);
            setZoom(18);
        } else {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserPos(newPos);
                    if (map) {
                        map.panTo(newPos);
                        setZoom(18);
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '60px', zIndex: 1000, background: '#010409' }}>

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
                        <div>
                            <h2 className="text-white text-[13px] font-black tracking-tight uppercase">
                                {viewMode === 'investigacion' ? 'Mapa Investigación' : 'Mapa Marcación'}
                            </h2>
                            <p className="text-[9px] text-gray-500 uppercase font-black flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                {viewMode === 'investigacion' ? fichas.length : marcaciones.length} Puntos Activos
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* BOTÓN DESCARGA MEJORADO */}
                        <button
                            onClick={() => setShowOfflineManager(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 border border-blue-400 text-white hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">OFFLINE</span>
                        </button>

                        <button
                            onClick={() => {
                                const types: ('hybrid' | 'roadmap' | 'bing' | 'osm')[] = ['hybrid', 'roadmap', 'bing', 'osm'];
                                const idx = types.indexOf(mapType);
                                setMapType(types[(idx + 1) % types.length]);
                            }}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors shadow-lg flex items-center justify-center"
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* SELECTOR DE ACTIVIDAD (Uno cada uno) */}
                <div className="flex bg-[#161b22]/80 backdrop-blur-sm border border-white/5 rounded-xl p-1 self-start ml-1">
                    <button
                        onClick={() => setViewMode('investigacion')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'investigacion' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Investigación
                    </button>
                    <button
                        onClick={() => setViewMode('marcacion')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'marcacion' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Marcación
                    </button>
                </div>
            </div>


            {/* Google Maps Container - posición absoluta para cubrir todo */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Map
                    center={center}
                    onCenterChanged={(ev) => setCenter(ev.detail.center)}
                    zoom={zoom}
                    onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
                    onTilesLoaded={() => setMapReady(true)}
                    mapId={MAP_ID}
                    mapTypeId={['hybrid', 'roadmap', 'satellite', 'terrain'].includes(mapType) ? mapType as any : 'roadmap'}
                    disableDefaultUI={true}
                    gestureHandling={'greedy'}
                    style={{ width: '100%', height: '100%' }}
                >
                    <BingLayer active={mapType === 'bing'} defaultType={mapType === 'bing' ? 'hybrid' : mapType} />
                    <OSMLayer active={mapType === 'osm'} />

                    {/* Marcador de Ubicación del Usuario (Punto Azul) */}
                    {userPos && (
                        <AdvancedMarker position={userPos}>
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-ping border border-blue-500/50"></div>
                                <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,132,255,1)]"></div>
                            </div>
                        </AdvancedMarker>
                    )}

                    {/* Marcadores de Investigación (Fichas) */}
                    {viewMode === 'investigacion' && fichas.map(ficha => (
                        <AdvancedMarker
                            key={ficha.id}
                            position={ficha.gps}
                            onClick={() => setSelectedFicha(ficha)}
                        >
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

                    {/* Marcadores de Marcación Rápida */}
                    {viewMode === 'marcacion' && marcaciones.map(m => (
                        <AdvancedMarker
                            key={m.id}
                            position={m.gps}
                        >
                            <div className="flex flex-col items-center group cursor-pointer">
                                <div className="bg-amber-600 p-2 rounded-xl border-2 border-white shadow-xl group-hover:scale-110 transition-transform">
                                    <MapPin size={16} color="white" />
                                </div>
                                <div className="mt-1 px-2 py-0.5 bg-black/80 rounded text-[8px] text-white font-black uppercase whitespace-nowrap">
                                    {m.tipo}
                                </div>
                            </div>
                        </AdvancedMarker>
                    ))}

                    {selectedFicha && viewMode === 'investigacion' && (
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
                    {viewMode === 'investigacion' ? (
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
                    ) : (
                        <div className="grid grid-cols-3 gap-2 bg-[#161b22]/90 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-2xl">
                            <div className="bg-amber-500/10 rounded-xl p-2 border border-amber-500/20 text-center">
                                <p className="text-[8px] text-amber-400 uppercase font-black">Pozos</p>
                                <p className="text-sm font-black text-white">{marcaciones.filter(m => m.tipo === 'pozo').length}</p>
                            </div>
                            <div className="bg-green-500/10 rounded-xl p-2 border border-green-500/20 text-center">
                                <p className="text-[8px] text-green-400 uppercase font-black">Sumideros</p>
                                <p className="text-sm font-black text-white">{marcaciones.filter(m => m.tipo === 'sumidero').length}</p>
                            </div>
                            <div className="bg-red-500/10 rounded-xl p-2 border border-red-500/20 text-center">
                                <p className="text-[8px] text-red-400 uppercase font-black">Otros</p>
                                <p className="text-sm font-black text-white">{marcaciones.filter(m => !['pozo', 'sumidero'].includes(m.tipo)).length}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showOfflineManager && (
                <OfflineMapManager
                    center={center}
                    onClose={() => setShowOfflineManager(false)}
                />
            )}
        </div>
    );
};

export default MapasScreen;
