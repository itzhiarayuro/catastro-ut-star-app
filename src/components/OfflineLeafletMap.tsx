import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTile } from '../lib/mapUtils';
import {
    X, LocateFixed, CheckCircle2, AlertTriangle, RefreshCw,
    Camera, Download, Layers
} from 'lucide-react';
import { FotoRegistro, procesarFoto } from '../utils/fotoProcessor';
import OfflineMapManager from './OfflineMapManager';

/* ══════════════════════════════════════════════════════════════
   OfflineLeafletMap
   Mapa basado en Leaflet que funciona 100% offline usando
   tiles almacenados en IndexedDB (descargados previamente).
   Se usa como FALLBACK cuando Google Maps no puede cargar
   (sin internet).
══════════════════════════════════════════════════════════════ */

// Custom TileLayer que busca en IndexedDB primero
class IDBTileLayer extends L.TileLayer {
    createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const tile = document.createElement('img');
        tile.setAttribute('role', 'presentation');
        tile.style.width = '256px';
        tile.style.height = '256px';

        const key = `osm_${coords.z}_${coords.x}_${coords.y}`;

        getTile(key).then(blob => {
            if (blob) {
                tile.src = URL.createObjectURL(blob);
                tile.onload = () => done(undefined, tile);
                tile.onerror = () => done(new Error('Tile load error'), tile);
            } else {
                // Si no está en cache, intentar cargar online
                const url = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
                tile.crossOrigin = 'anonymous';
                tile.src = url;
                tile.onload = () => done(undefined, tile);
                tile.onerror = () => {
                    // Si tampoco carga online, mostrar tile vacío
                    tile.src = '';
                    tile.style.background = '#1a1f2e';
                    tile.style.border = '1px solid rgba(255,255,255,0.03)';
                    done(undefined, tile);
                };
            }
        }).catch(() => {
            tile.style.background = '#1a1f2e';
            done(undefined, tile);
        });

        return tile;
    }
}

interface OfflineLeafletMapProps {
    initialCoords: { lat: number; lng: number };
    onConfirm: (coords: { lat: number; lng: number; precision: number }) => void;
    onScreenshot?: (foto: FotoRegistro) => void;
    onClose: () => void;
    pozoId?: string;
    toast?: (msg: string) => void;
}

const OfflineLeafletMap: React.FC<OfflineLeafletMapProps> = ({
    initialCoords, onConfirm, onScreenshot, onClose, pozoId, toast: parentToast
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [mapCenter, setMapCenter] = useState(
        initialCoords.lat && initialCoords.lng
            ? initialCoords
            : { lat: 6.2442, lng: -75.5812 }
    );
    const [accuracy, setAccuracy] = useState(0);
    const [isLocating, setIsLocating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showOfflineManager, setShowOfflineManager] = useState(false);
    const [localToast, setLocalToast] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const gpsMarkerRef = useRef<L.CircleMarker | null>(null);
    const accuracyCircleRef = useRef<L.Circle | null>(null);

    const toast = (msg: string) => {
        if (parentToast) parentToast(msg);
        else { setLocalToast(msg); setTimeout(() => setLocalToast(null), 2500); }
    };

    const isGoodAccuracy = accuracy > 0 && accuracy <= 20;
    const isBadAccuracy = accuracy > 20;

    // Inicializar Leaflet
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [mapCenter.lat, mapCenter.lng],
            zoom: 17,
            zoomControl: false,
            attributionControl: false,
        });

        // Usar nuestro TileLayer personalizado que busca en IndexedDB
        new IDBTileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            tileSize: 256,
        }).addTo(map);

        map.on('moveend', () => {
            const c = map.getCenter();
            setMapCenter({ lat: c.lat, lng: c.lng });
            setIsDragging(false);
        });

        map.on('movestart', () => setIsDragging(true));

        mapRef.current = map;

        // Pedir GPS al abrir
        snapToGPS();

        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            map.remove();
            mapRef.current = null;
        };
    }, []);

    const snapToGPS = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setAccuracy(pos.coords.accuracy);

                if (mapRef.current) {
                    mapRef.current.setView([newPos.lat, newPos.lng], mapRef.current.getZoom());

                    // Actualizar marcador GPS
                    if (gpsMarkerRef.current) gpsMarkerRef.current.setLatLng([newPos.lat, newPos.lng]);
                    else {
                        gpsMarkerRef.current = L.circleMarker([newPos.lat, newPos.lng], {
                            radius: 6, fillColor: '#3b82f6', fillOpacity: 1,
                            color: '#fff', weight: 2
                        }).addTo(mapRef.current);
                    }

                    // Actualizar círculo de precisión
                    if (accuracyCircleRef.current) {
                        accuracyCircleRef.current.setLatLng([newPos.lat, newPos.lng]);
                        accuracyCircleRef.current.setRadius(pos.coords.accuracy);
                    } else {
                        accuracyCircleRef.current = L.circle([newPos.lat, newPos.lng], {
                            radius: pos.coords.accuracy,
                            fillColor: '#3b82f6', fillOpacity: 0.12,
                            color: '#3b82f6', weight: 1.5, opacity: 0.6
                        }).addTo(mapRef.current);
                    }
                }

                setMapCenter(newPos);

                if (pos.coords.accuracy < 20) {
                    setIsLocating(false);
                    if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                }
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
        setTimeout(() => setIsLocating(false), 20000);
    };

    // Captura del mapa como canvas (funciona offline!)
    const handleCaptureMap = async () => {
        if (!onScreenshot || !mapRef.current) return;
        setIsCapturing(true);

        try {
            // Importar html2canvas dinámicamente o usar el canvas nativo
            const mapContainer = mapRef.current.getContainer();

            // Usar canvas API nativa del navegador
            const canvas = document.createElement('canvas');
            const rect = mapContainer.getBoundingClientRect();
            canvas.width = rect.width * 2; // Retina
            canvas.height = rect.height * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas no soportado');

            // Dibujar fondo oscuro
            ctx.fillStyle = '#1a1f2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Obtener los tiles visibles y dibujarlos en el canvas
            const map = mapRef.current;
            const bounds = map.getBounds();
            const zoom = Math.round(map.getZoom());
            const size = map.getSize();

            // Calcular tiles visibles
            const tileSize = 256;
            const nwPoint = map.project(bounds.getNorthWest(), zoom);
            const sePoint = map.project(bounds.getSouthEast(), zoom);

            const tileXMin = Math.floor(nwPoint.x / tileSize);
            const tileYMin = Math.floor(nwPoint.y / tileSize);
            const tileXMax = Math.floor(sePoint.x / tileSize);
            const tileYMax = Math.floor(sePoint.y / tileSize);

            // Cargar y dibujar cada tile
            const promises: Promise<void>[] = [];
            for (let tx = tileXMin; tx <= tileXMax; tx++) {
                for (let ty = tileYMin; ty <= tileYMax; ty++) {
                    const key = `osm_${zoom}_${tx}_${ty}`;
                    promises.push(
                        getTile(key).then(blob => {
                            if (!blob) return;
                            return new Promise<void>((resolve) => {
                                const img = new Image();
                                img.onload = () => {
                                    const pixelX = (tx * tileSize - nwPoint.x) * (canvas.width / size.x);
                                    const pixelY = (ty * tileSize - nwPoint.y) * (canvas.height / size.y);
                                    const scaleX = tileSize * (canvas.width / size.x);
                                    const scaleY = tileSize * (canvas.height / size.y);
                                    ctx.drawImage(img, pixelX, pixelY, scaleX, scaleY);
                                    URL.revokeObjectURL(img.src);
                                    resolve();
                                };
                                img.onerror = () => resolve();
                                img.src = URL.createObjectURL(blob);
                            });
                        })
                    );
                }
            }

            await Promise.all(promises);

            // Dibujar marcador central
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
            ctx.fillStyle = '#2563eb';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Agregar texto de coordenadas
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${mapCenter.lat.toFixed(7)}, ${mapCenter.lng.toFixed(7)}`, centerX, canvas.height - 22);
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#93c5fd';
            ctx.fillText(`Pozo: ${pozoId || 'N/A'} | Zoom: ${zoom}`, centerX, canvas.height - 46);

            // Convertir a base64
            const base64data = canvas.toDataURL('image/jpeg', 0.85);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `MAPA-${pozoId || 'P'}-${zoom}z-${timestamp}.JPG`;

            // Descargar
            const link = document.createElement('a');
            link.href = base64data;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            const newFoto = procesarFoto(filename, pozoId || 'M', base64data);
            onScreenshot({ ...newFoto, blobId: base64data });

            setIsCapturing(false);
            toast("📸 Mapa capturado (modo offline)");
        } catch (err) {
            console.error("Error capturando mapa offline:", err);
            setIsCapturing(false);
            toast("❌ Error al capturar mapa");
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100dvh', maxHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* ── TOP BAR ─── */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, padding: '14px 14px 0', display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none' }}>
                    <button onClick={onClose} style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '10px', color: '#fff', display: 'flex' }}>
                        <X size={18} />
                    </button>

                    <button onClick={() => setShowOfflineManager(true)} style={{ pointerEvents: 'auto', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '14px', padding: '10px', color: '#60a5fa', display: 'flex' }} title="Descargar área offline">
                        <Download size={18} />
                    </button>

                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            📡 MODO OFFLINE — Leaflet
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff', marginTop: '2px' }}>
                            {mapCenter.lat.toFixed(7)}, {mapCenter.lng.toFixed(7)}
                        </div>
                    </div>
                </div>

                {/* ── MAPA LEAFLET ─── */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                    {/* Mira central */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none', zIndex: 999,
                        transform: isDragging ? 'translateY(-16px)' : 'translateY(0)',
                        transition: 'transform 0.15s ease',
                    }}>
                        {!isDragging && (
                            <div style={{
                                position: 'absolute', width: '16px', height: '6px',
                                background: 'rgba(0,0,0,0.35)', borderRadius: '50%',
                                bottom: 'calc(50% - 3px)', filter: 'blur(2px)',
                            }} />
                        )}
                        <div style={{
                            filter: isDragging ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                            transition: 'filter 0.15s',
                        }}>
                            <svg viewBox="0 0 40 56" width="40" height="56" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M20 0C8.954 0 0 8.954 0 20c0 14 20 36 20 36s20-22 20-36C40 8.954 31.046 0 20 0z"
                                    fill={isDragging ? '#f59e0b' : '#2563eb'}
                                    stroke="#ffffff" strokeWidth="2.5"
                                />
                                <circle cx="20" cy="19" r="8" fill="#ffffff" opacity="0.95" />
                                <circle cx="20" cy="19" r="4" fill={isDragging ? '#f59e0b' : '#2563eb'} />
                            </svg>
                        </div>
                    </div>

                    {/* Botones laterales */}
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button onClick={snapToGPS} style={{
                            background: isLocating ? '#2563eb' : 'rgba(0,0,0,0.85)',
                            border: `2px solid ${isLocating ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '14px', padding: '12px', color: isLocating ? '#fff' : '#93c5fd',
                            display: 'flex', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        }} title="Centrar en mi ubicación GPS">
                            {isLocating ? <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} /> : <LocateFixed size={22} />}
                        </button>

                        {onScreenshot && (
                            <button onClick={handleCaptureMap} disabled={isCapturing} style={{
                                background: isCapturing ? '#475569' : '#059669',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '14px', padding: '12px', color: '#fff',
                                display: 'flex', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            }} title="Capturar mapa">
                                {isCapturing ? <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={22} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── BOTTOM PANEL ─── */}
                <div style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 14px 24px' }}>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span>👆</span>
                        <span>Mueve el mapa hasta centrar la <strong style={{ color: '#60a5fa' }}>mira azul</strong> sobre el pozo</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                        <div style={{
                            flex: '0 0 auto', minWidth: '88px',
                            background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '10px 12px',
                            border: `1px solid ${isGoodAccuracy ? 'rgba(34,197,94,0.3)' : isBadAccuracy ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        }}>
                            <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2px' }}>GPS ±</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{
                                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                                    background: isGoodAccuracy ? '#22c55e' : isBadAccuracy ? '#ef4444' : '#64748b',
                                    boxShadow: isGoodAccuracy ? '0 0 6px #22c55e' : isBadAccuracy ? '0 0 6px #ef4444' : 'none',
                                }} />
                                <span style={{
                                    fontFamily: 'monospace', fontWeight: 900, fontSize: '14px',
                                    color: isGoodAccuracy ? '#22c55e' : isBadAccuracy ? '#ef4444' : '#94a3b8',
                                }}>
                                    {accuracy > 0 ? `${accuracy.toFixed(0)}m` : '—'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
                                onConfirm({ ...mapCenter, precision: accuracy || 99 });
                            }}
                            style={{
                                flex: 1, background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                                color: '#fff', border: 'none', borderRadius: '16px',
                                fontWeight: 900, fontSize: '15px', letterSpacing: '0.02em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '16px', cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                                minHeight: '64px',
                            }}
                        >
                            <CheckCircle2 size={22} />
                            CONFIRMAR PUNTO
                        </button>
                    </div>

                    {isBadAccuracy && (
                        <div style={{ marginTop: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            <span style={{ fontSize: '10px', color: '#fcd34d', lineHeight: 1.4 }}>
                                Señal GPS débil ({accuracy.toFixed(0)}m de error). Puedes confirmar igualmente.
                            </span>
                        </div>
                    )}
                </div>

                {localToast && (
                    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl z-[10001]">
                        {localToast}
                    </div>
                )}

                {isCapturing && (
                    <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 2000, animation: 'flash 0.5s ease-out' }}></div>
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes flash { from { opacity: 0.8; } to { opacity: 0; } }
                    .leaflet-tile-pane { background: #0b0e14 !important; }
                `}</style>
            </div>

            {showOfflineManager && (
                <OfflineMapManager
                    center={mapCenter}
                    onClose={() => setShowOfflineManager(false)}
                />
            )}
        </div>
    );
};

export default OfflineLeafletMap;
