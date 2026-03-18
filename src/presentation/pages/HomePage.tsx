import React from 'react';
import { Save, Plus, Cloud, List, Settings as SettingsIcon, Home } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { FichaService } from '../../application/services/FichaService';

interface HomePageProps {
    setShowSyncScreen: (show: boolean) => void;
    toast: (msg: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ setShowSyncScreen, toast }) => {
    const { 
        activeScreen, 
        setActiveScreen, 
        fichas, 
        isOnline, 
        pendingCount, 
        pendingMarcaciones,
        currentStep,
        setCurrentStep,
        setState,
        ...state 
    } = useAppStore();

    const fichasArr = Object.values(fichas).filter(f => !f.deleted);
    const totalFichas = fichasArr.length;
    const pendingFichas = fichasArr.filter(f => !f.synced).length;
    const syncedFichas = totalFichas - pendingFichas;

    const handleStartNew = () => {
        FichaService.startNewFicha(state as any, setState, setCurrentStep, setActiveScreen);
    };

    return (
        <div id="s0" className={`screen ${activeScreen === 's0' ? 'active' : ''} `}>
            <div className="home-center">
                <div className="home-logo-container">
                    <img src="/logo-ut-star.png" alt="UT STAR Logo" className="home-logo-img" />
                </div>
                <div>
                    <div className="home-title">Ficha <span>Catastro</span><br />Alcantarillado</div>
                </div>

                {/* Sync Summary Card */}
                <div className="sync-summary-card">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Resumen de Hoy</span>
                        <div className={`flex items-center gap-1 text-[9px] font-bold ${isOnline ? 'text-green-500' : 'text-amber-500'} `}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500 animate-pulse'} `}></div>
                            {isOnline ? 'CONECTADO' : 'MODO OFFLINE'}
                        </div>
                    </div>
                    <div className="sync-grid">
                        <div className="sync-stat synced">
                            <label>Fichas en Nube</label>
                            <div className="sync-stat-val">{syncedFichas}<span>{totalFichas} total</span></div>
                        </div>
                        <div className="sync-stat pending">
                            <label>Fotos Pendientes</label>
                            <div className="sync-stat-val">{pendingCount}<span>cola Drive</span></div>
                        </div>
                    </div>
                </div>

                <div className="home-badge">
                    <span className="dot"></span>
                    UT STAR · Municipio {state.municipio}
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {state.id && (
                        <button
                            className="btn btn-yellow btn-full py-4 text-sm"
                            onClick={() => setActiveScreen('sForm')}
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                        >
                            <Save size={18} />
                            Continuar Borrador ({state.pozo || 'Sin Nombre'})
                        </button>
                    )}

                    <button className="btn btn-green btn-full py-4 text-sm" onClick={handleStartNew}>
                        <Plus size={18} strokeWidth={3} />
                        Nueva Inspección
                    </button>

                    {(pendingCount > 0 || pendingFichas > 0 || pendingMarcaciones > 0) && (
                        <button className="btn btn-blue btn-full relative py-4 group overflow-hidden" onClick={() => setShowSyncScreen(true)} style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none' }}>
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                            <Cloud size={16} className="z-10" />
                            <span className="z-10">Sincronización Nocturna</span>
                            <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#020617] font-black z-20">
                                {pendingCount + pendingFichas + pendingMarcaciones}
                            </span>
                        </button>
                    )}

                    <button className="btn btn-ghost btn-full" onClick={() => setActiveScreen('sFichas')}>
                        <List size={16} />
                        Historial de Fichas
                    </button>

                    <button className="btn btn-ghost btn-full mt-4" onClick={() => setActiveScreen('sActivity')} style={{ border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b' }}>
                        <SettingsIcon size={14} />
                        Cambiar a Marcación / Selección
                    </button>

                    <button className="btn btn-ghost btn-full mt-2" onClick={() => setActiveScreen('sPortal')} style={{ opacity: 0.8, fontSize: '11px', color: 'var(--blue)' }}>
                        <Home size={14} className="mr-2" /> Inicio / Volver al Portal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
