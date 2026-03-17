import React, { useState, useEffect } from 'react';
import { useAuth } from './lib/firebase';
import LoginPage from './components/LoginPage';
import {
    Home, List, MapPin, Settings as SettingsIcon,
    FileText, AlertTriangle,
    RefreshCw, LogOut, Copy,
    Trash2
} from 'lucide-react';
import SyncScreen from './components/SyncScreen';
import MapasScreen from './components/MapasScreen';
import GeoTracker from './components/SmartGeoTracker';
import MarcacionScreen from './components/MarcacionScreen';
import {
    getPendingPhotosCount,
    savePhotoToStorage,
    getAllFichasFromStorage,
    saveFichaToStorage,
} from './utils/storageManager';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useRegisterSW } from 'virtual:pwa-register/react';

// ── Page Components (extracted) ──────────────────────────────
import FormPage from './presentation/pages/FormPage';
import HomePage from './presentation/pages/HomePage';
import PortalPage from './presentation/pages/PortalPage';
import FichasPage from './presentation/pages/FichasPage';
import ConfigPage from './presentation/pages/ConfigPage';
import ActivitySelectPage from './presentation/pages/ActivitySelectPage';
import FichasViewerPage from './presentation/pages/FichasViewerPage';
import UnauthorizedPage from './presentation/pages/UnauthorizedPage';

const APP_VERSION = '1.5.0';

import {
    AppState,
    INITIAL_STATE,
    MUNICIPIOS,
} from './types/catastro';
import { useAppStore } from './hooks/useAppStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useRulesEngine } from './hooks/useRulesEngine';
import { usePdfExport } from './hooks/usePdfExport';
import { useCloudRestore } from './hooks/useCloudRestore';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import { useFichaActions } from './hooks/useFichaActions';


/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

const App: React.FC = () => {
    const store = useAppStore();
    const {
        setState, activeScreen, setActiveScreen,
        currentStep, setCurrentStep, fichas, setFichas,
        isOnline, setIsOnline, pendingCount, setPendingCount,
        pendingMarcaciones, setPendingMarcaciones,
        ...state
    } = store;

    const { user, isAuthorized, loading: authLoading, logout } = useAuth();

    // ── Local UI State ──────────────────────────────────────────────
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [showSyncScreen, setShowSyncScreen] = useState(false);
    const [showGeoTracker, setShowGeoTracker] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showClearDbModal, setShowClearDbModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [clearDbConfirmText, setClearDbConfirmText] = useState('');
    const [marcacionMode, setMarcacionMode] = useState<'PZ' | 'SUMIDERO' | 'OTRO'>('PZ');

    // ── Hooks ──────────────────────────────────────────────
    useFirebaseSync();

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    const toast = (msg: string) => {
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const { handlePDF, pdfLoading, setPdfDebugLogs, pdfDebugLogs } = usePdfExport(toast);
    useRulesEngine(state as any, setState as any);

    /**
     * Guarda las fichas de forma segura en ambos storages (LS e IDB).
     */
    const safeSaveAllFichas = async (updatedFichas: Record<string, AppState>) => {
        setFichas(updatedFichas);

        for (const f of Object.values(updatedFichas)) {
            await saveFichaToStorage(f);
        }

        try {
            localStorage.setItem('fichas_star', JSON.stringify(updatedFichas));
            localStorage.removeItem('fichas_star_meta');
        } catch (e: any) {
            if (e.name === 'QuotaExceededError' || e.message?.includes('exceeded the quota')) {
                console.warn("⚠️ QuotaExceeded en LocalStorage. Usando fallback de metadatos.");
                const metadata: Record<string, any> = {};
                Object.values(updatedFichas).forEach(f => {
                    metadata[f.id!] = {
                        id: f.id,
                        pozo: f.pozo,
                        synced: f.synced,
                        savedAt: f.savedAt || f.createdAt,
                        municipio: f.municipio
                    };
                });
                try {
                    localStorage.setItem('fichas_star_meta', JSON.stringify(metadata));
                    localStorage.removeItem('fichas_star');
                } catch (inner) {
                    console.error("❌ Fallo crítico de storage:", inner);
                }
            } else {
                console.error("❌ Error al persistir fichas:", e);
            }
        }
    };

    // ── Extracted Hooks (depend on safeSaveAllFichas) ──────
    const { restoreFromCloud, restoreMarcacionesFromCloud, repairMarcacionesSync } =
        useCloudRestore({ toast, safeSaveAllFichas });

    useBackgroundSync({ safeSaveAllFichas });

    const {
        updateState, startNewFicha, continueDraft, handleEditFromMap,
        saveFicha, deleteFicha, confirmDelete, captureGPS,
        deleteId, setDeleteId, deleteConfirmText, setDeleteConfirmText,
        loading, safeSetDraft,
    } = useFichaActions({ toast, safeSaveAllFichas });

    // ── Simple Effects ──────────────────────────────────────
    useEffect(() => {
        localStorage.setItem('catastro_active_screen', activeScreen);
    }, [activeScreen]);

    useEffect(() => {
        localStorage.setItem('catastro_current_step', currentStep.toString());
    }, [currentStep]);

    useEffect(() => {
        (window as any).CURRENT_MUNICIPIO = state.municipio;
    }, [state.municipio]);

    // Check pending photos for indicator
    useEffect(() => {
        const checkPending = async () => {
            const count = await getPendingPhotosCount();
            setPendingCount(count);

            const savedMarc = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
            const pendingM = (savedMarc as any[]).filter(m => !m.synced && !m.deleted).length;
            setPendingMarcaciones(pendingM);
        };
        const interval = setInterval(checkPending, 30000);
        checkPending();
        return () => clearInterval(interval);
    }, []);

    // Load fichas from Hybrid Storage (LS + IDB)
    useEffect(() => {
        const loadAllFichas = async () => {
            let combinedFichas: Record<string, AppState> = {};

            try {
                const idbFichas = await getAllFichasFromStorage();
                combinedFichas = { ...idbFichas };
            } catch (e) {
                console.error("Error loading from IDB", e);
            }

            const savedLS = localStorage.getItem('fichas_star');
            if (savedLS) {
                try {
                    const lsFichas = JSON.parse(savedLS);
                    combinedFichas = { ...lsFichas, ...combinedFichas };

                    for (const f of Object.values(lsFichas)) {
                        await saveFichaToStorage(f);
                    }
                    console.log("🚚 Migradas fichas de LocalStorage a IndexedDB");
                } catch (e) {
                    console.error("Error parsing fichas from LS", e);
                }
            }

            setFichas(combinedFichas);
        };

        loadAllFichas();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ── Utility Functions ──────────────────────────────────
    const forceHardReload = async () => {
        toast("🧹 Limpiando caché y reiniciando...");
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }
            sessionStorage.clear();
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set('v', Date.now().toString());
            window.location.replace(url.toString());
        } catch (e) {
            console.error("Error during hard reload:", e);
            window.location.reload();
        }
    };

    const onHandlePDF = async (customPozo?: AppState) => {
        const pozoToExport = customPozo || (state as any);
        await handlePDF(pozoToExport);
    };

    const handleExcel = async () => {
        const { exportToExcel } = await import('./utils/export');
        exportToExcel(Object.values(fichas));
        toast("📝 Excel Generado");
    };

    /* ═════════════════════════════════════
       RENDER LOGIC
    ═════════════════════════════════════ */

    if (authLoading) return (
        <div style={{ background: '#020617', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!user) return <LoginPage />;

    if (!isAuthorized) return (
        <UnauthorizedPage user={user} logout={logout} />
    );

    return (
        <APIProvider apiKey={import.meta.env.VITE_FIREBASE_API_KEY} libraries={['marker']}>
            <div className="app-container">

                {activeScreen === 'sPortal' && (
                    <PortalPage
                        setShowLogoutModal={setShowLogoutModal}
                    />
                )}
                {activeScreen === 'sActivity' && (
                    <ActivitySelectPage
                        setMarcacionMode={setMarcacionMode}
                    />
                )}
                {activeScreen === 'sMarcacion' && (
                    <MarcacionScreen
                        user={user}
                        mode={marcacionMode}
                        onBack={() => setActiveScreen('sActivity')}
                        onSync={() => { setShowSyncScreen(true); }}
                        onSuccess={(m) => toast(m)}
                    />
                )}
                {activeScreen === 's0' && (
                    <HomePage
                        setShowSyncScreen={setShowSyncScreen}
                        toast={toast}
                    />
                )}
                {activeScreen === 'sFichas' && (
                    <FichasPage
                        toast={toast}
                        handlePDF={onHandlePDF}
                        pdfLoading={pdfLoading}
                        safeSaveAllFichas={safeSaveAllFichas}
                    />
                )}
                {activeScreen === 'sConfig' && (
                    <ConfigPage
                        APP_VERSION={APP_VERSION}
                        MUNICIPIOS={MUNICIPIOS}
                        setShowLogoutModal={setShowLogoutModal}
                        setShowClearDbModal={setShowClearDbModal}
                        setClearDbConfirmText={setClearDbConfirmText}
                        restoreFromCloud={restoreFromCloud}
                        restoreMarcacionesFromCloud={restoreMarcacionesFromCloud}
                        repairMarcacionesSync={repairMarcacionesSync}
                        forceHardReload={forceHardReload}
                    />
                )}
                {activeScreen === 'sForm' && (
                    <FormPage
                        toast={toast}
                        loading={loading}
                        saveFicha={saveFicha}
                        handleExcel={handleExcel}
                        handlePDF={onHandlePDF}
                        pdfLoading={pdfLoading}
                        setShowGeoTracker={setShowGeoTracker}
                        startNewFicha={startNewFicha}
                    />
                )}
                {activeScreen === 'sMaps' && <MapasScreen onEditFicha={handleEditFromMap} onBack={() => setActiveScreen('s0')} />}
                {activeScreen === 'sFichasViewer' && <FichasViewerPage />}

                {showSyncScreen && (
                    <SyncScreen
                        fichas={fichas}
                        onFichasUpdated={async (updated) => {
                            await safeSaveAllFichas(updated);
                        }}
                        onClose={() => setShowSyncScreen(false)}
                    />
                )}

                {showGeoTracker && (
                    <GeoTracker
                        initialCoords={{ lat: state.gps.lat || 4.908, lng: state.gps.lng || -73.948 }}
                        onClose={() => setShowGeoTracker(false)}
                        pozoId={state.pozo}
                        onConfirm={(c) => {
                            updateState({ gps: c });
                            setShowGeoTracker(false);
                            toast("🎯 Punto Exacto Fijado");
                        }}
                        onScreenshot={async (foto: any) => {
                            updateState({ fotoList: [...state.fotoList, foto] });
                            await savePhotoToStorage({
                                id: foto.id,
                                pozoId: state.pozo || 'S/N',
                                municipio: state.municipio,
                                barrio: state.barrio,
                                filename: foto.filename,
                                blob: foto.blobId!,
                                categoria: 'General',
                                inspector: user?.name || 'Desconocido',
                                timestamp: Date.now(),
                                synced: false
                            });
                        }}
                    />
                )}

                {/* MODAL CERRAR SESIÓN (Global) */}
                {showLogoutModal && isAuthorized && (
                    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="bg-[#1c2230] border border-amber-500/20 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl text-center animate-zoomIn">
                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                                <LogOut size={36} className="text-amber-500" />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Cerrar Sesión</h3>
                            <p className="text-gray-400 text-[10px] mb-6 uppercase tracking-widest">{user?.name} ({user?.email})</p>

                            <div className="space-y-3 mb-8">
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                                    <p className="text-gray-300 text-[11px] leading-relaxed">
                                        <span className="text-amber-500 font-black">⚠️ SEÑAL REQUERIDA:</span> Si sales en zona sin señal, <span className="text-white font-bold">no podrás entrar</span> hasta volver a tener internet.
                                    </p>
                                </div>

                                {pendingCount > 0 && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                                        <p className="text-red-400 text-[11px] font-bold leading-relaxed">
                                            ⚠️ TIENES {pendingCount} FOTOS SIN SUBIR. <br />
                                            Sincroniza antes de salir para evitar pérdida de datos.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    className="w-full p-5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl shadow-xl shadow-amber-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    onClick={async () => {
                                        setLoggingOut(true);
                                        localStorage.removeItem('catastro_active_screen');
                                        setActiveScreen('sActivity');
                                        await logout();
                                        setShowLogoutModal(false);
                                        setLoggingOut(false);
                                    }}
                                    disabled={loggingOut}
                                >
                                    {loggingOut ? (
                                        <span className="flex items-center gap-2">
                                            <span className="spinner-white"></span>
                                            CERRANDO...
                                        </span>
                                    ) : (
                                        <>CERRAR SESIÓN AHORA <LogOut size={20} /></>
                                    )}
                                </button>

                                <button
                                    className="w-full p-4 bg-white/5 hover:bg-white/10 text-gray-500 font-bold rounded-2xl transition-all"
                                    onClick={() => setShowLogoutModal(false)}
                                    disabled={loggingOut}
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL PELIGRO: LIMPIAR BASE DE DATOS LOCAL */}
                {showClearDbModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 20000,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(12px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div style={{
                            backgroundColor: '#161b22', border: '1px solid rgba(255, 69, 96, 0.3)',
                            borderRadius: '28px', padding: '32px 24px', width: '100%', maxWidth: '360px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(255, 69, 96, 0.1)',
                            textAlign: 'center', position: 'relative', maxHeight: '90vh', overflowY: 'auto'
                        }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(255, 69, 96, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255, 69, 96, 0.2)' }}>
                                <AlertTriangle size={32} color="#FF4560" />
                            </div>

                            <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Limpieza Crítica</h3>
                            <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>Base de Datos Local</p>

                            <div style={{ background: 'rgba(255, 69, 96, 0.05)', border: '1px solid rgba(255, 69, 96, 0.1)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
                                <p style={{ color: '#fca5a5', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', lineHeight: '1.6', margin: 0 }}>
                                    ⚠️ ¡ELIMINACIÓN TOTAL! <br />
                                    <span style={{ opacity: 0.6, fontWeight: '400' }}>BORRARÁ FICHAS NO SINCRONIZADAS Y FOTOS. NO SE PUEDE REVERTIR.</span>
                                </p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ color: '#64748b', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>ESCRIBE <span style={{ color: 'white', fontWeight: 'bold' }}>ELIMINAR</span> PARA CONFIRMAR:</p>
                                <input
                                    type="text"
                                    style={{ width: '100%', background: '#0d1117', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '14px', color: 'white', textAlign: 'center', fontSize: '14px', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.2s', textTransform: 'uppercase' }}
                                    value={clearDbConfirmText}
                                    onChange={e => setClearDbConfirmText(e.target.value)}
                                    placeholder="ELIMINAR"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    style={{ width: '100%', padding: '16px', background: '#FF4560', color: 'white', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 8px 16px rgba(255, 69, 96, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.1s active' }}
                                    onClick={() => {
                                        if (clearDbConfirmText.toLowerCase() === 'eliminar') {
                                            localStorage.removeItem('fichas_star');
                                            localStorage.removeItem('catastro_draft');
                                            setFichas({});
                                            setShowClearDbModal(false);
                                            toast("🗑️ Memoria local totalmente limpia");
                                        } else {
                                            toast("❌ Escribe exactamente 'eliminar'");
                                        }
                                    }}
                                >
                                    SÍ, ELIMINAR TODO <Trash2 size={16} />
                                </button>

                                <button
                                    style={{ width: '100%', padding: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', borderRadius: '16px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer' }}
                                    onClick={() => setShowClearDbModal(false)}
                                >
                                    CANCELAR Y REGRESAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PDF DEBUG LOGS MODAL */}
                {pdfDebugLogs && (
                    <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-[#0f172a] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-blue-500/30 flex flex-col shadow-2xl">
                            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#1e293b]/50 rounded-t-2xl shrink-0">
                                <div>
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                        <FileText size={18} className="text-blue-400" />
                                        Traza de Generación de PDF (Debug)
                                    </h3>
                                    <p className="text-[11px] text-gray-400 font-mono mt-1">Logs del servidor detallando la resolución de la ficha.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pdfDebugLogs.join('\n'));
                                            toast("✅ Logs copiados al portapapeles");
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg"
                                    >
                                        <Copy size={16} /> COPIAR LOGS
                                    </button>
                                    <button
                                        onClick={() => setPdfDebugLogs(null)}
                                        className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 text-gray-400 w-10 h-10 rounded-lg flex items-center justify-center transition border border-white/10 text-lg shadow-lg"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-[#020617] rounded-b-2xl custom-scrollbar relative">
                                <pre className="text-[11px] md:text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                    {pdfDebugLogs.length === 0 ? (
                                        <div className="text-gray-500 italic p-4 text-center">El servidor no retornó traza de logs.</div>
                                    ) : (
                                        pdfDebugLogs.map((line, i) => {
                                            let colorClass = "text-gray-300";
                                            if (line.includes("[ERROR]")) colorClass = "text-red-400 font-bold bg-red-900/20";
                                            else if (line.includes("[WARN]")) colorClass = "text-amber-400";
                                            else if (line.includes("✅")) colorClass = "text-green-400";
                                            else if (line.includes("❌")) colorClass = "text-red-400";
                                            else if (line.startsWith("===")) colorClass = "text-blue-400/80 font-bold";
                                            else if (line.includes("Generando PDF")) colorClass = "text-white font-bold";

                                            return (
                                                <div key={i} className={`pb-1 mb-1 border-b border-white/5 break-all ${colorClass}`}>
                                                    {line}
                                                </div>
                                            );
                                        })
                                    )}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* TOAST NOTIFICATION */}
                <div id="toast" className={showToast ? 'show' : ''}>{toastMsg}</div>

                {/* PWA UPDATE NOTIFICATION BANNER */}
                {needRefresh && (
                    <div className="fixed bottom-20 left-4 right-4 bg-amber-500 text-black p-4 rounded-xl shadow-lg flex items-center justify-between z-[9999] border-2 border-amber-600">
                        <div className="flex items-center gap-2">
                            <RefreshCw size={20} className="animate-spin" />
                            <div>
                                <span className="font-bold text-sm block">¡Nueva versión disponible!</span>
                                <span className="text-[10px] opacity-80">Toca para aplicar cambios</span>
                            </div>
                        </div>
                        <button
                            onClick={() => updateServiceWorker(true)}
                            className="bg-black text-amber-500 px-4 py-2 rounded-lg font-bold text-xs shadow-md active:scale-95 transition-transform"
                        >
                            ACTUALIZAR
                        </button>
                    </div>
                )}

                {/* BOTTOM NAV */}
                <nav className="bottom-nav">
                    <button
                        className={`nav-btn ${activeScreen === 'sActivity' || activeScreen === 's0' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sActivity')}
                    >
                        <Home size={20} />
                        <span>Inicio</span>
                    </button>
                    <button
                        className={`nav-btn ${activeScreen === 'sFichas' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sFichas')}
                    >
                        <div className="relative">
                            <List size={20} />
                            {Object.values(fichas).filter(f => !f.deleted).length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-blue-500 text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-[#020617] font-black">
                                    {Object.values(fichas).filter(f => !f.deleted).length}
                                </span>
                            )}
                        </div>
                        <span>Fichas</span>
                    </button>
                    {(user?.email?.includes('juanvegas003') || user?.email?.includes('juan.vega.icya')) && (
                        <button
                            className={`nav-btn ${activeScreen === 'sFichasViewer' ? 'active' : ''}`}
                            onClick={() => setActiveScreen('sFichasViewer')}
                        >
                            <FileText size={20} />
                            <span>Fichas Totales</span>
                        </button>
                    )}
                    <button
                        className={`nav-btn ${activeScreen === 'sMaps' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sMaps')}
                    >
                        <MapPin size={20} />
                        <span>Mapa</span>
                    </button>
                    <button
                        className={`nav-btn ${activeScreen === 'sConfig' ? 'active' : ''}`}
                        onClick={() => setActiveScreen('sConfig')}
                    >
                        <SettingsIcon size={20} />
                        <span>Config</span>
                    </button>
                </nav>
            </div>
        </APIProvider>
    );
};

export default App;
