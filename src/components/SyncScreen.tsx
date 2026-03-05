import React, { useState, useEffect } from 'react';
import { Cloud, Wifi, Battery, Moon, Sun, ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, Info, MapPin, Camera } from 'lucide-react';
import { syncPhotosToDrive } from '../utils/driveSync';
import { syncFichasToFirestore, syncMarcacionesToFirestore, validateFicha } from '../utils/syncRegistry';
import { getPendingPhotosCount } from '../utils/storageManager';

interface SyncScreenProps {
    fichas: Record<string, any>;
    onFichasUpdated: (fichas: Record<string, any>) => void;
    onClose: () => void;
}

const SyncScreen: React.FC<SyncScreenProps> = ({ fichas, onFichasUpdated, onClose }) => {
    const [status, setStatus] = useState<'IDLE' | 'SYNCING' | 'COMPLETED' | 'ERROR'>('IDLE');
    const [progress, setProgress] = useState({ total: 0, synced: 0, currentFile: '', error: null as string | null });
    const [pendingPhotos, setPendingPhotos] = useState(0);
    const [pendingMarcaciones, setPendingMarcaciones] = useState(0);

    // Conteo de fichas por estado
    const fichasArr = Object.values(fichas);
    const readyToSync = fichasArr.filter(f => !f.synced && validateFicha(f));
    const incomplete = fichasArr.filter(f => !f.synced && !validateFicha(f));
    const alreadySynced = fichasArr.filter(f => f.synced);
    const [wakeLock, setWakeLock] = useState<any>(null);

    // Cargar conteos al inicio
    useEffect(() => {
        const loadCounts = async () => {
            const photoCount = await getPendingPhotosCount();
            setPendingPhotos(photoCount);

            const savedMarc = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
            const pendingM = (savedMarc as any[]).filter(m => !m.synced && !m.deleted).length;
            setPendingMarcaciones(pendingM);
        };
        loadCounts();
    }, []);

    // Request Wake Lock to prevent screen sleep
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    const lock = await (navigator as any).wakeLock.request('screen');
                    setWakeLock(lock);
                    console.log("Wake Lock is active");
                } catch (err: any) {
                    console.error(`${err.name}, ${err.message}`);
                }
            }
        };

        if (status === 'SYNCING') {
            requestWakeLock();
        }

        return () => {
            if (wakeLock) {
                wakeLock.release().then(() => setWakeLock(null));
            }
        };
    }, [status]);

    const handleStartSync = async () => {
        setStatus('SYNCING');
        try {
            // 1. Sincronizar Fichas a Firestore
            const updatedFichas = await syncFichasToFirestore(fichas, (p) => {
                setProgress({
                    total: p.total,
                    synced: p.current - 1,
                    currentFile: p.msg,
                    error: null
                });
            });
            onFichasUpdated(updatedFichas);

            // 1.b Sincronizar Marcaciones a Firestore
            await syncMarcacionesToFirestore((p) => {
                setProgress({
                    total: p.total,
                    synced: p.current - 1,
                    currentFile: p.msg,
                    error: null
                });
            });

            // 2. Sincronizar Fotos a Drive
            await syncPhotosToDrive((p) => {
                setProgress({
                    total: p.total,
                    synced: p.synced,
                    currentFile: p.currentFile,
                    error: p.error
                });
            });

            setStatus('COMPLETED');
        } catch (err: any) {
            console.error("Sync error:", err);
            setStatus('ERROR');
            setProgress(prev => ({ ...prev, error: err.message || "Error desconocido" }));
        }
    };

    const progressPercent = progress.total > 0 ? Math.round((progress.synced / progress.total) * 100) : 0;

    return (
        <div className="sync-overlay">
            {/* Header */}
            <header className="sync-header">
                <button onClick={onClose} className="btn-ghost" style={{ border: 'none', padding: '10px' }}>
                    <ArrowLeft size={24} />
                </button>
                <div className="sync-header-titles">
                    <h1 className="sync-header-title">Sincronización Nocturna</h1>
                    <span className="sync-header-sub">MODO: ALWAYS-ON ACTIVE</span>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <Wifi size={18} className="text-green-500" />
                    <Battery size={18} className="text-green-500" />
                </div>
            </header>

            {/* Main Content */}
            <main className="sync-main">
                {status === 'IDLE' && (
                    <div className="sync-card">
                        <div className="sync-icon-container">
                            <div className="sync-icon-pulse"></div>
                            <Moon size={64} className="text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Listo para sincronizar</h2>

                        <div className="flex flex-col gap-2 mb-8 w-full max-w-[280px] mx-auto text-left">
                            <div className="flex justify-between items-center bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                <span className="text-xs text-blue-300 font-bold uppercase">Listas para subir</span>
                                <span className="text-xl font-black text-blue-400">{readyToSync.length}</span>
                            </div>

                            <div className="flex justify-between items-center bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-cyan-400" />
                                    <span className="text-xs text-cyan-300 font-bold uppercase">Marcaciones</span>
                                </div>
                                <span className="text-xl font-black text-cyan-400">{pendingMarcaciones}</span>
                            </div>

                            <div className="flex justify-between items-center bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 text-purple-300">
                                <div className="flex items-center gap-2">
                                    <Camera size={14} className="text-purple-400" />
                                    <span className="text-xs font-bold uppercase">Fotos Drive</span>
                                </div>
                                <span className="text-xl font-black text-purple-400">{pendingPhotos}</span>
                            </div>

                            {incomplete.length > 0 && (
                                <div className="flex justify-between items-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-red-300 font-bold uppercase">Incompletas</span>
                                        <span className="text-[9px] text-red-400/70 uppercase">Faltan campos obligatorios</span>
                                    </div>
                                    <span className="text-xl font-black text-red-500">{incomplete.length}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center bg-slate-500/5 p-3 rounded-xl border border-white/5">
                                <span className="text-xs text-slate-400 font-bold uppercase">Ya sincronizadas</span>
                                <span className="text-xl font-black text-slate-500">{alreadySynced.length}</span>
                            </div>
                        </div>

                        {readyToSync.length > 0 || pendingPhotos > 0 || pendingMarcaciones > 0 ? (
                            <>
                                <p className="text-slate-400 text-sm max-w-xs mb-8">
                                    Conecta el cargador y mantén la pantalla encendida para una subida segura a Google Drive.
                                </p>
                                <button
                                    onClick={handleStartSync}
                                    className="sync-btn-primary"
                                >
                                    <RefreshCw size={20} />
                                    Comenzar Ahora
                                </button>
                            </>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl">
                                <p className="text-red-400 text-xs font-bold leading-relaxed">
                                    {incomplete.length > 0
                                        ? "⚠️ No se puede iniciar: Tienes fichas incompletas. Por favor completa todos los campos (Cámara, Rasante, Diámetro) antes de subir."
                                        : "✅ Todo al día: No hay fichas pendientes por sincronizar."
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {status === 'SYNCING' && (
                    <div className="sync-card">
                        <div className="sync-icon-container">
                            <div className="sync-icon-pulse"></div>
                            <Cloud size={64} className="text-blue-400" />
                        </div>

                        <div className="sync-progress-labels">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Subiendo...</span>
                            <span className="text-2xl font-mono font-bold text-blue-400">{progressPercent}%</span>
                        </div>

                        <div className="sync-progress-bar">
                            <div
                                className="sync-progress-fill"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>

                        <div className="mt-8">
                            <p className="text-slate-300 text-xs font-mono truncate">{progress.currentFile || 'Preparando archivos...'}</p>
                            <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-tight">
                                {progress.synced} de {progress.total} fotos procesadas
                            </p>
                        </div>
                    </div>
                )}

                {status === 'COMPLETED' && (
                    <div className="sync-card">
                        <div className="sync-icon-container" style={{ borderColor: 'rgba(34, 197, 94, 0.2)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
                            <CheckCircle size={64} className="text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-green-400">¡Sincronización Exitosa!</h2>
                        <p className="text-slate-400 text-sm max-w-xs mb-12">
                            Todas tus fotos están seguras en el Workspace de Google Drive.
                        </p>
                        <button
                            onClick={onClose}
                            className="btn btn-ghost py-4 px-12"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                )}

                {status === 'ERROR' && (
                    <div className="sync-card">
                        <div className="sync-icon-container" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                            <AlertTriangle size={64} className="text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-red-400">Hubo un problema</h2>
                        <p className="text-slate-400 text-sm max-w-xs mb-8">
                            {progress.error || 'No se pudo completar la sincronización. Verifica tu conexión.'}
                        </p>
                        <button
                            onClick={handleStartSync}
                            className="sync-btn-primary"
                            style={{ backgroundColor: '#dc2626' }}
                        >
                            Reintentar
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-500 text-sm underline mt-4"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </main>

            {/* Footer Info */}
            <footer className="sync-footer">
                <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                    <Info size={18} className="text-slate-400" />
                </div>
                <div className="sync-footer-info">
                    ESTA PANTALLA NO SE APAGARÁ AUTOMÁTICAMENTE. SE RECOMIENDA DEJAR CARGANDO EL DISPOSITIVO PARA EVITAR DESCARGAS POR EL PROCESO DE COMPRESIÓN.
                </div>
            </footer>
        </div>
    );
};

export default SyncScreen;
