import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Map, useMap } from '@vis.gl/react-google-maps';
import {
    X,
    Layers,
    LocateFixed,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Camera,
    Download
} from 'lucide-react';
import { BingLayer } from './BingLayer';
import { FotoRegistro, procesarFoto } from '../utils/fotoProcessor';
import OfflineMapManager from './OfflineMapManager';

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_ID;

// ── Círculo de precisión GPS usando API nativa ────────────────────────────────
const AccuracyCircle = ({ center, radius }: { center: google.maps.LatLngLiteral; radius: number }) => {
    const map = useMap();
    const circleRef = useRef<google.maps.Circle | null>(null);

    useEffect(() => {
        if (!map) return;
        circleRef.current = new google.maps.Circle({
            map,
            center,
            radius,
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            clickable: false,
        });
        return () => { circleRef.current?.setMap(null); };
    }, [map]);

    useEffect(() => {
        circleRef.current?.setCenter(center);
        circleRef.current?.setRadius(radius);
    }, [center, radius]);

    return null;
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface GeoTrackerProps {
    initialCoords: { lat: number; lng: number };
    onConfirm: (coords: { lat: number; lng: number; precision: number }) => void;
    onScreenshot?: (foto: FotoRegistro) => void;
    onClose: () => void;
    pozoId?: string;
    toast?: (msg: string) => void;
}

// ── Componente principal ──────────────────────────────────────────────────────
const GeoTracker: React.FC<GeoTrackerProps> = ({ initialCoords, onConfirm, onScreenshot, onClose, pozoId, toast: parentToast }) => {
    const map = useMap();
    const [localToast, setLocalToast] = useState<string | null>(null);

    const toast = (msg: string) => {
        if (parentToast) {
            parentToast(msg);
        } else {
            setLocalToast(msg);
            setTimeout(() => setLocalToast(null), 2500);
        }
    };
    const hasInitial = !!(initialCoords.lat && initialCoords.lng);
    const defaultPos = hasInitial ? initialCoords : { lat: 6.2442, lng: -75.5812 };

    // Centro del mapa = el punto que se confirmará (sigue la mira)
    const [mapCenter, setMapCenter] = useState(defaultPos);
    const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
    const [accuracy, setAccuracy] = useState(0);
    const [isLocating, setIsLocating] = useState(false);
    const [mapType, setMapType] = useState<'hybrid' | 'roadmap' | 'bing' | 'osm'>('hybrid');
    const [isDragging, setIsDragging] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureZoom, setCaptureZoom] = useState(20);
    const [showOfflineManager, setShowOfflineManager] = useState(false);

    const watchId = useRef<number | null>(null);

    // Pedir GPS UNA vez al abrir
    const snapToGPS = useCallback(() => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);

        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setGpsPos(newPos);
                setAccuracy(pos.coords.accuracy);
                setMapCenter(newPos); // centra el mapa en GPS
                if (pos.coords.accuracy < 20) {
                    setIsLocating(false);
                    navigator.geolocation.clearWatch(watchId.current!);
                    watchId.current = null;
                }
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
        setTimeout(() => setIsLocating(false), 20000);
    }, []);

    useEffect(() => {
        snapToGPS();
        return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
    }, []);

    const isGoodAccuracy = accuracy > 0 && accuracy <= 20;
    const isBadAccuracy = accuracy > 20;

    const handleCaptureMap = async () => {
        if (!onScreenshot || !map) return;
        setIsCapturing(true);
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

            // Usar valores REALES del mapa en este instante, no solo el estado
            const currentZoom = Math.round(map.getZoom() || captureZoom);
            const currentCenter = map.getCenter();
            if (!currentCenter) throw new Error("No se pudo obtener el centro del mapa");

            const lat = currentCenter.lat();
            const lng = currentCenter.lng();

            console.log(`Capturando mapa en Zoom: ${currentZoom}, Lat: ${lat}, Lng: ${lng}`);

            // Google Static Maps API URL - Forzamos parámetros para que el pantallazo sea idéntico
            const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${currentZoom}&size=640x640&scale=2&maptype=${mapType === 'roadmap' ? 'roadmap' : 'hybrid'}&markers=color:blue%7C${lat},${lng}&key=${apiKey}`;

            const response = await fetch(staticMapUrl);
            if (!response.ok) throw new Error("Error en la respuesta de Static Maps");

            const blob = await response.blob();

            // Creamos un nombre de archivo más descriptivo
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `MAPA-${pozoId || 'P'}-${currentZoom}z-${timestamp}.JPG`;

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;

                // TRUCO PARA GALERÍA EN MÓVIL: 
                // 1. Intentamos el Share API si el navegador lo permite (mejor para Galería)
                if (navigator.share && (navigator as any).canShare && (navigator as any).canShare({ files: [new File([blob], filename, { type: 'image/jpeg' })] })) {
                    try {
                        const file = new File([blob], filename, { type: 'image/jpeg' });
                        await navigator.share({
                            files: [file],
                            title: 'Captura de Mapa',
                            text: `Ubicación Pozo ${pozoId}`
                        });
                    } catch (shareErr) {
                        // Fallback al link tradicional si el usuario cancela o falla
                        const link = document.createElement('a');
                        link.href = base64data;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                } else {
                    // Fallback tradicional para navegadores que no soportan Share API con archivos
                    const link = document.createElement('a');
                    link.href = base64data;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }

                const newFoto = procesarFoto(filename, pozoId || 'M', base64data);
                onScreenshot({ ...newFoto, blobId: base64data });

                setIsCapturing(false);
                toast("📸 Mapa guardado en Galería/Descargas");
            };
        } catch (err) {
            console.error("Error capturando mapa:", err);
            setIsCapturing(false);
            toast("❌ Error al capturar: Revisa tu conexión");
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100dvh', maxHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* ── TOP BAR ──────────────────────────────────────────────── */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: '14px 14px 0', display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none' }}>
                    {/* Cerrar */}
                    <button
                        onClick={onClose}
                        style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '10px', color: '#fff', display: 'flex' }}
                    >
                        <X size={18} />
                    </button>

                    {/* Descargar Offline */}
                    <button
                        onClick={() => setShowOfflineManager(true)}
                        style={{ pointerEvents: 'auto', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '14px', padding: '10px', color: '#60a5fa', display: 'flex' }}
                        title="Descargar área offline"
                    >
                        <Download size={18} />
                    </button>

                    {/* Coordenadas en vivo */}
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#60a5fa', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {isDragging ? '📍 Soltá para fijar el punto' : '🎯 Centro del mapa = tu punto'}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff', marginTop: '2px' }}>
                            {mapCenter.lat.toFixed(7)}, {mapCenter.lng.toFixed(7)}
                        </div>
                    </div>

                    {/* Capas */}
                    <button
                        onClick={() => {
                            const types: ('hybrid' | 'roadmap' | 'bing' | 'osm')[] = ['hybrid', 'roadmap', 'bing', 'osm'];
                            const idx = types.indexOf(mapType);
                            setMapType(types[(idx + 1) % types.length]);
                        }}
                        style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Layers size={18} />
                        <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {mapType === 'hybrid' ? 'Satélite' :
                                mapType === 'roadmap' ? 'Calles' :
                                    mapType === 'bing' ? 'Bing Sat' : 'Offline'}
                        </span>
                    </button>

                    {/* Captura de Mapa */}
                    {onScreenshot && (
                        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '4px' }}>
                            <select
                                value={captureZoom}
                                onChange={(e) => setCaptureZoom(Number(e.target.value))}
                                style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '4px', color: '#fff', fontSize: '10px' }}
                            >
                                <option value="15">1:2000</option>
                                <option value="17">1:1000</option>
                                <option value="19">1:500</option>
                                <option value="20">1:250</option>
                            </select>
                            <button
                                onClick={handleCaptureMap}
                                disabled={isCapturing}
                                style={{ background: isCapturing ? '#475569' : '#059669', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '10px', color: '#fff', display: 'flex', alignItems: 'center' }}
                            >
                                {isCapturing ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={18} />}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── MAPA ─────────────────────────────────────────────────── */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <Map
                        center={mapCenter}
                        onCenterChanged={(ev) => {
                            setMapCenter(ev.detail.center);
                            setIsDragging(true);
                        }}
                        zoom={captureZoom}
                        onZoomChanged={(ev) => {
                            setCaptureZoom(ev.detail.zoom);
                        }}
                        onDragend={() => setIsDragging(false)}
                        mapId={MAP_ID}
                        mapTypeId={['hybrid', 'roadmap', 'satellite', 'terrain'].includes(mapType) ? mapType as any : 'roadmap'}
                        disableDefaultUI={true}
                        gestureHandling="greedy"
                        style={{ width: '100%', height: '100%' }}
                    >
                        <BingLayer active={mapType === 'bing'} defaultType={mapType === 'bing' ? 'hybrid' : mapType} />

                        {/* Círculo de precisión GPS (muestra radio del GPS, no del punto manual) */}
                        {gpsPos && accuracy > 0 && (
                            <AccuracyCircle center={gpsPos} radius={accuracy} />
                        )}
                    </Map>

                    {/* ── MIRA FIJA EN EL CENTRO (no se mueve) ─────────────── */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none', zIndex: 10,
                        transform: isDragging ? 'translateY(-16px)' : 'translateY(0)',
                        transition: 'transform 0.15s ease',
                    }}>
                        {/* Sombra del pin en el suelo */}
                        {!isDragging && (
                            <div style={{
                                position: 'absolute',
                                width: '16px', height: '6px',
                                background: 'rgba(0,0,0,0.35)',
                                borderRadius: '50%',
                                bottom: 'calc(50% - 3px)',
                                filter: 'blur(2px)',
                            }} />
                        )}

                        {/* Pin SVG */}
                        <div style={{
                            filter: isDragging
                                ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))'
                                : 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                            transition: 'filter 0.15s',
                        }}>
                            <svg viewBox="0 0 40 56" width="40" height="56" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M20 0C8.954 0 0 8.954 0 20c0 14 20 36 20 36s20-22 20-36C40 8.954 31.046 0 20 0z"
                                    fill={isDragging ? '#f59e0b' : '#2563eb'}
                                    stroke="#ffffff"
                                    strokeWidth="2.5"
                                />
                                <circle cx="20" cy="19" r="8" fill="#ffffff" opacity="0.95" />
                                <circle cx="20" cy="19" r="4" fill={isDragging ? '#f59e0b' : '#2563eb'} />
                            </svg>
                        </div>
                    </div>

                    {/* ── BOTÓN GPS (snap a mi ubicación) ──────────────────── */}
                    <button
                        onClick={snapToGPS}
                        style={{
                            position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                            zIndex: 15, background: isLocating ? '#2563eb' : 'rgba(0,0,0,0.85)',
                            border: `2px solid ${isLocating ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '14px', padding: '12px', color: isLocating ? '#fff' : '#93c5fd',
                            display: 'flex', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            transition: 'all 0.2s',
                        }}
                        title="Centrar en mi ubicación GPS"
                    >
                        {isLocating
                            ? <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
                            : <LocateFixed size={22} />
                        }
                    </button>
                </div>

                {/* ── BOTTOM PANEL ─────────────────────────────────────────── */}
                <div style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 14px 24px' }}>

                    {/* Instrucción */}
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span>👆</span>
                        <span>Mueve el mapa hasta centrar la <strong style={{ color: '#60a5fa' }}>mira azul</strong> sobre el pozo</span>
                    </div>

                    {/* Precisión GPS + Botón confirmar */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>

                        {/* Badge de precisión */}
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

                        {/* Confirmar */}
                        <button
                            onClick={() => {
                                if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
                                onConfirm({ ...mapCenter, precision: accuracy || 99 });
                            }}
                            style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                                color: '#fff', border: 'none', borderRadius: '16px',
                                fontWeight: 900, fontSize: '15px', letterSpacing: '0.02em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '16px', cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                                transition: 'transform 0.1s, box-shadow 0.1s',
                                minHeight: '64px',
                            }}
                            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            <CheckCircle2 size={22} />
                            CONFIRMAR PUNTO
                        </button>
                    </div>

                    {/* Warning precisión mala */}
                    {isBadAccuracy && (
                        <div style={{ marginTop: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            <span style={{ fontSize: '10px', color: '#fcd34d', lineHeight: 1.4 }}>
                                Señal GPS débil ({accuracy.toFixed(0)}m de error). Puedes confirmar igualmente: la mira marca el punto exacto.
                            </span>
                        </div>
                    )}
                </div>

                {/* Feedback local del toast */}
                {localToast && (
                    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl z-[10001] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {localToast}
                    </div>
                )}

                {/* Flash effect when capturing */}
                {isCapturing && (
                    <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 1000, animation: 'flash 0.5s ease-out' }}></div>
                )}

                {/* Keyframes para el spin y flash */}
                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes flash { from { opacity: 0.8; } to { opacity: 0; } }
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

export default GeoTracker;
