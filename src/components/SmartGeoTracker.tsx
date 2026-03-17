import React, { useState, useEffect } from 'react';
import { FotoRegistro } from '../utils/fotoProcessor';

/* ══════════════════════════════════════════════════════════════
   SmartGeoTracker
   Wrapper inteligente que decide si usar:
   - Google Maps (GeoTracker) cuando hay internet
   - Leaflet Offline Map cuando NO hay internet
   
   Esto resuelve el problema de que Google Maps SDK no carga
   sin conexión, y los tiles descargados no se pueden ver.
══════════════════════════════════════════════════════════════ */

// Lazy imports para no cargar ambos siempre
const GeoTrackerOnline = React.lazy(() => import('./GeoTracker'));
const OfflineLeafletMap = React.lazy(() => import('./OfflineLeafletMap'));

interface SmartGeoTrackerProps {
    initialCoords: { lat: number; lng: number };
    onConfirm: (coords: { lat: number; lng: number; precision: number }) => void;
    onScreenshot?: (foto: FotoRegistro) => void;
    onClose: () => void;
    pozoId?: string;
    toast?: (msg: string) => void;
}

const SmartGeoTracker: React.FC<SmartGeoTrackerProps> = (props) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [forceOffline, setForceOffline] = useState(false);
    const [googleLoaded, setGoogleLoaded] = useState(false);
    const [checkingGoogle, setCheckingGoogle] = useState(true);

    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    // Verificar si Google Maps SDK está realmente disponible
    useEffect(() => {
        if (!isOnline || forceOffline) {
            setCheckingGoogle(false);
            return;
        }

        // Timeout de 3 seg para decidir
        const timeout = setTimeout(() => {
            setCheckingGoogle(false);
        }, 3000);

        // Chequear si google.maps ya existe (SDK cargado por APIProvider)
        if (typeof google !== 'undefined' && google.maps) {
            setGoogleLoaded(true);
            setCheckingGoogle(false);
            clearTimeout(timeout);
        } else {
            // Esperar a que cargue
            const interval = setInterval(() => {
                if (typeof google !== 'undefined' && google.maps) {
                    setGoogleLoaded(true);
                    setCheckingGoogle(false);
                    clearInterval(interval);
                    clearTimeout(timeout);
                }
            }, 500);
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }
    }, [isOnline, forceOffline]);

    const useOffline = !isOnline || forceOffline || (!checkingGoogle && !googleLoaded);

    // Loading state
    if (checkingGoogle && isOnline && !forceOffline) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                <div className="spinner-small" style={{ width: '32px', height: '32px' }} />
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Cargando mapa...</div>
                <button
                    onClick={() => setForceOffline(true)}
                    style={{ marginTop: '20px', color: '#f59e0b', fontSize: '11px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '8px 16px', cursor: 'pointer' }}
                >
                    📡 Usar Mapa Offline
                </button>
            </div>
        );
    }

    return (
        <React.Suspense fallback={
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner-small" style={{ width: '32px', height: '32px' }} />
            </div>
        }>
            {useOffline ? (
                <OfflineLeafletMap {...props} />
            ) : (
                <GeoTrackerOnline {...props} />
            )}
        </React.Suspense>
    );
};

export default SmartGeoTracker;
