import React, { useState, useEffect } from 'react';
import { useAuth } from './lib/firebase';
import LoginPage from './components/LoginPage';
import { RefreshCw } from 'lucide-react';
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

// ── Page Components ──────────────────────────────────────────
import FormPage from './presentation/pages/FormPage';
import HomePage from './presentation/pages/HomePage';
import PortalPage from './presentation/pages/PortalPage';
import FichasPage from './presentation/pages/FichasPage';
import ConfigPage from './presentation/pages/ConfigPage';
import ActivitySelectPage from './presentation/pages/ActivitySelectPage';
import FichasViewerPage from './presentation/pages/FichasViewerPage';
import UnauthorizedPage from './presentation/pages/UnauthorizedPage';

// ── UI Components ────────────────────────────────────────────
import { LogoutModal, ClearDbModal, PdfDebugModal } from './components/AppModals';
import BottomNav from './components/BottomNav';

// ── Types & Config ──────────────────────────────────────────
import { AppState, MUNICIPIOS } from './types/catastro';

// ── Hooks ───────────────────────────────────────────────────
import { useAppStore } from './hooks/useAppStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useRulesEngine } from './hooks/useRulesEngine';
import { usePdfExport } from './hooks/usePdfExport';
import { useCloudRestore } from './hooks/useCloudRestore';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import { useFichaActions } from './hooks/useFichaActions';

const APP_VERSION = '1.5.0';

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

    // ── Local UI State ───────────────────────────────────────
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [showSyncScreen, setShowSyncScreen] = useState(false);
    const [showGeoTracker, setShowGeoTracker] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showClearDbModal, setShowClearDbModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [clearDbConfirmText, setClearDbConfirmText] = useState('');
    const [marcacionMode, setMarcacionMode] = useState<'PZ' | 'SUMIDERO' | 'OTRO'>('PZ');

    // ── Core Hooks ───────────────────────────────────────────
    useFirebaseSync();

    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    const toast = (msg: string) => {
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const { handlePDF, pdfLoading, setPdfDebugLogs, pdfDebugLogs } = usePdfExport(toast);
    useRulesEngine(state as any, setState as any);

    /** Guarda las fichas en ambos storages (LS e IDB). */
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
                    metadata[f.id!] = { id: f.id, pozo: f.pozo, synced: f.synced, savedAt: f.savedAt || f.createdAt, municipio: f.municipio };
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

    // ── Extracted Business Logic Hooks ────────────────────────
    const { restoreFromCloud, restoreMarcacionesFromCloud, repairMarcacionesSync } =
        useCloudRestore({ toast, safeSaveAllFichas });

    useBackgroundSync({ safeSaveAllFichas });

    const {
        updateState, startNewFicha, handleEditFromMap,
        saveFicha, loading,
    } = useFichaActions({ toast, safeSaveAllFichas });

    // ── Simple Effects ───────────────────────────────────────
    useEffect(() => { localStorage.setItem('catastro_active_screen', activeScreen); }, [activeScreen]);
    useEffect(() => { localStorage.setItem('catastro_current_step', currentStep.toString()); }, [currentStep]);
    useEffect(() => { (window as any).CURRENT_MUNICIPIO = state.municipio; }, [state.municipio]);

    useEffect(() => {
        const checkPending = async () => {
            const count = await getPendingPhotosCount();
            setPendingCount(count);
            const savedMarc = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
            setPendingMarcaciones((savedMarc as any[]).filter(m => !m.synced && !m.deleted).length);
        };
        const interval = setInterval(checkPending, 30000);
        checkPending();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadAllFichas = async () => {
            let combinedFichas: Record<string, AppState> = {};
            try {
                const idbFichas = await getAllFichasFromStorage();
                combinedFichas = { ...idbFichas };
            } catch (e) { console.error("Error loading from IDB", e); }

            const savedLS = localStorage.getItem('fichas_star');
            if (savedLS) {
                try {
                    const lsFichas = JSON.parse(savedLS);
                    combinedFichas = { ...lsFichas, ...combinedFichas };
                    for (const f of Object.values(lsFichas)) { await saveFichaToStorage(f); }
                    console.log("🚚 Migradas fichas de LocalStorage a IndexedDB");
                } catch (e) { console.error("Error parsing fichas from LS", e); }
            }
            setFichas(combinedFichas);
        };
        loadAllFichas();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }, []);

    // ── Utility Functions ────────────────────────────────────
    const forceHardReload = async () => {
        toast("🧹 Limpiando caché y reiniciando...");
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) await r.unregister();
            }
            if ('caches' in window) {
                const names = await caches.keys();
                for (const n of names) await caches.delete(n);
            }
            sessionStorage.clear();
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set('v', Date.now().toString());
            window.location.replace(url.toString());
        } catch (e) { console.error("Error during hard reload:", e); window.location.reload(); }
    };

    const onHandlePDF = async (customPozo?: AppState) => {
        await handlePDF(customPozo || (state as any));
    };

    const handleExcel = async () => {
        const { exportToExcel } = await import('./utils/export');
        exportToExcel(Object.values(fichas));
        toast("📝 Excel Generado");
    };

    /* ═════════════════════════════════════
       RENDER
    ═════════════════════════════════════ */

    if (authLoading) return (
        <div style={{ background: '#020617', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
    );

    if (!user) return <LoginPage />;
    if (!isAuthorized) return <UnauthorizedPage user={user} logout={logout} />;

    return (
        <APIProvider apiKey={import.meta.env.VITE_FIREBASE_API_KEY} libraries={['marker']}>
            <div className="app-container">

                {/* ── Screen Router ────────────────────────── */}
                {activeScreen === 'sPortal' && <PortalPage setShowLogoutModal={setShowLogoutModal} />}
                {activeScreen === 'sActivity' && <ActivitySelectPage setMarcacionMode={setMarcacionMode} />}
                {activeScreen === 'sMarcacion' && (
                    <MarcacionScreen user={user} mode={marcacionMode}
                        onBack={() => setActiveScreen('sActivity')}
                        onSync={() => setShowSyncScreen(true)}
                        onSuccess={(m) => toast(m)} />
                )}
                {activeScreen === 's0' && <HomePage setShowSyncScreen={setShowSyncScreen} toast={toast} />}
                {activeScreen === 'sFichas' && (
                    <FichasPage toast={toast} handlePDF={onHandlePDF} pdfLoading={pdfLoading} safeSaveAllFichas={safeSaveAllFichas} />
                )}
                {activeScreen === 'sConfig' && (
                    <ConfigPage APP_VERSION={APP_VERSION} MUNICIPIOS={MUNICIPIOS}
                        setShowLogoutModal={setShowLogoutModal} setShowClearDbModal={setShowClearDbModal}
                        setClearDbConfirmText={setClearDbConfirmText} restoreFromCloud={restoreFromCloud}
                        restoreMarcacionesFromCloud={restoreMarcacionesFromCloud} repairMarcacionesSync={repairMarcacionesSync}
                        forceHardReload={forceHardReload} />
                )}
                {activeScreen === 'sForm' && (
                    <FormPage toast={toast} loading={loading} saveFicha={saveFicha} handleExcel={handleExcel}
                        handlePDF={onHandlePDF} pdfLoading={pdfLoading}
                        setShowGeoTracker={setShowGeoTracker} startNewFicha={startNewFicha} />
                )}
                {activeScreen === 'sMaps' && <MapasScreen onEditFicha={handleEditFromMap} onBack={() => setActiveScreen('s0')} />}
                {activeScreen === 'sFichasViewer' && <FichasViewerPage />}

                {/* ── Overlays ─────────────────────────────── */}
                {showSyncScreen && (
                    <SyncScreen fichas={fichas}
                        onFichasUpdated={async (u) => { await safeSaveAllFichas(u); }}
                        onClose={() => setShowSyncScreen(false)} />
                )}

                {showGeoTracker && (
                    <GeoTracker
                        initialCoords={{ lat: state.gps.lat || 4.908, lng: state.gps.lng || -73.948 }}
                        onClose={() => setShowGeoTracker(false)}
                        pozoId={state.pozo}
                        onConfirm={(c) => { updateState({ gps: c }); setShowGeoTracker(false); toast("🎯 Punto Exacto Fijado"); }}
                        onScreenshot={async (foto: any) => {
                            updateState({ fotoList: [...state.fotoList, foto] });
                            await savePhotoToStorage({
                                id: foto.id, pozoId: state.pozo || 'S/N', municipio: state.municipio,
                                barrio: state.barrio, filename: foto.filename, blob: foto.blobId!,
                                categoria: 'General', inspector: user?.name || 'Desconocido',
                                timestamp: Date.now(), synced: false
                            });
                        }}
                    />
                )}

                {/* ── Modals ──────────────────────────────── */}
                {showLogoutModal && isAuthorized && (
                    <LogoutModal
                        user={user} pendingCount={pendingCount} loggingOut={loggingOut}
                        onConfirm={async () => {
                            setLoggingOut(true);
                            localStorage.removeItem('catastro_active_screen');
                            setActiveScreen('sActivity');
                            await logout();
                            setShowLogoutModal(false);
                            setLoggingOut(false);
                        }}
                        onCancel={() => setShowLogoutModal(false)}
                    />
                )}

                {showClearDbModal && (
                    <ClearDbModal
                        confirmText={clearDbConfirmText}
                        onConfirmTextChange={setClearDbConfirmText}
                        onConfirm={() => {
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
                        onCancel={() => setShowClearDbModal(false)}
                    />
                )}

                {pdfDebugLogs && (
                    <PdfDebugModal
                        logs={pdfDebugLogs}
                        onCopy={() => { navigator.clipboard.writeText(pdfDebugLogs.join('\n')); toast("✅ Logs copiados"); }}
                        onClose={() => setPdfDebugLogs(null)}
                    />
                )}

                {/* ── Toast ───────────────────────────────── */}
                <div id="toast" className={showToast ? 'show' : ''}>{toastMsg}</div>

                {/* ── PWA Update Banner ────────────────────── */}
                {needRefresh && (
                    <div className="fixed bottom-20 left-4 right-4 bg-amber-500 text-black p-4 rounded-xl shadow-lg flex items-center justify-between z-[9999] border-2 border-amber-600">
                        <div className="flex items-center gap-2">
                            <RefreshCw size={20} className="animate-spin" />
                            <div>
                                <span className="font-bold text-sm block">¡Nueva versión disponible!</span>
                                <span className="text-[10px] opacity-80">Toca para aplicar cambios</span>
                            </div>
                        </div>
                        <button onClick={() => updateServiceWorker(true)}
                            className="bg-black text-amber-500 px-4 py-2 rounded-lg font-bold text-xs shadow-md active:scale-95 transition-transform">
                            ACTUALIZAR
                        </button>
                    </div>
                )}

                {/* ── Bottom Nav ───────────────────────────── */}
                <BottomNav
                    activeScreen={activeScreen}
                    setActiveScreen={setActiveScreen}
                    fichas={fichas}
                    userEmail={user?.email}
                />
            </div>
        </APIProvider>
    );
};

export default App;
