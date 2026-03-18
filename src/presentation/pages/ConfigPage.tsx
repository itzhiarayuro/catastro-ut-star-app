import React, { useState } from 'react';
import { ChevronLeft, Wifi, WifiOff, Cloud, RefreshCw, Trash2, LogOut } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { useAuth } from '../../lib/firebase';

interface ConfigPageProps {
    APP_VERSION: string;
    MUNICIPIOS: string[];
    restoreFromCloud: () => void;
    restoreMarcacionesFromCloud: () => void;
    repairMarcacionesSync: () => void;
    setShowClearDbModal: (show: boolean) => void;
    setClearDbConfirmText: (text: string) => void;
    setShowLogoutModal: (show: boolean) => void;
    forceHardReload: () => void;
}

const ConfigPage: React.FC<ConfigPageProps> = ({
    APP_VERSION,
    MUNICIPIOS,
    restoreFromCloud,
    restoreMarcacionesFromCloud,
    repairMarcacionesSync,
    setShowClearDbModal,
    setClearDbConfirmText,
    setShowLogoutModal,
    forceHardReload
}) => {
    const { 
        activeScreen, 
        setActiveScreen, 
        fichas, 
        isOnline, 
        pendingCount, 
        setState,
        ...state 
    } = useAppStore();
    const { user } = useAuth();

    const updateState = (updates: any) => {
        setState(updates);
    };

    return (
        <div id="sConfig" className={`screen ${activeScreen === 'sConfig' ? 'active' : ''} `}>
            <div className="app-header">
                <div className="header-inner">
                    <button onClick={() => setActiveScreen('s0')} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Configuración</div>
                        <div className="header-sub">UT STAR · V{APP_VERSION}</div>
                    </div>
                </div>
            </div>
            <div className="content">
                <div className="card">
                    <div className="card-title">Municipio de Trabajo</div>
                    <div className="chips">
                        {MUNICIPIOS.map(m => (
                            <div
                                key={m}
                                className={`chip ${state.municipio === m ? 'selected' : ''} `}
                                onClick={() => updateState({ municipio: m })}
                            >
                                {m}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card">
                    <div className="card-title">Estado del Sistema</div>
                    <div className="flex flex-col gap-3 text-xs">
                        <div className={`p-2 rounded-lg flex items-center gap-2 ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                            {isOnline ? 'CONEXIÓN ESTABLE' : 'MODO OFFLINE'}
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                            <div className="text-gray-400">Total fichas locales:</div>
                            <div className="font-bold text-white">{Object.keys(fichas).length} fichas</div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                            <div className="text-gray-400">Fotos en cola local:</div>
                            <div className="font-bold text-amber-400">{pendingCount} fotos <span className="text-[10px] text-gray-500 ml-1">(~{(pendingCount * 1.2).toFixed(1)} MB)</span></div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginTop: '20px', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                    <div className="card-title" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cloud size={16} /> Recuperación (Backup)
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: '1.4', marginBottom: '12px' }}>
                        Si perdiste tus datos locales por problemas de memoria del navegador o si cambiaste de celular, puedes descargar nuevamente las fichas que ya subiste a la nube.
                    </p>
                    <button className="btn btn-blue btn-full mb-3" onClick={restoreFromCloud}>
                        <RefreshCw size={16} /> Descargar fichas (Investigación)
                    </button>
                    <button className="btn btn-blue btn-full mb-3" onClick={restoreMarcacionesFromCloud} style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', border: 'none' }}>
                        <RefreshCw size={16} /> Descargar marcaciones (Hoy/Reciente)
                    </button>
                    <button className="btn btn-ghost btn-full" onClick={repairMarcacionesSync} style={{ border: '1px dashed #3b82f6', color: '#3b82f6', fontSize: '10px' }}>
                        <RefreshCw size={12} /> ¿Borraste algo de la nube? Resubir mis datos locales
                    </button>
                </div>

                <button
                    className="btn btn-danger btn-full"
                    onClick={() => { setClearDbConfirmText(''); setShowClearDbModal(true); }}
                    style={{ marginBottom: '12px' }}
                >
                    <Trash2 size={16} /> Limpiar Base de Datos Local
                </button>

                <div className="card" style={{ marginTop: '20px', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
                    <div className="card-title" style={{ color: '#ef4444' }}>Sesión de Usuario</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{user?.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{user?.email}</div>
                        </div>
                    </div>
                    <button
                        className="btn btn-danger-light btn-full"
                        onClick={() => { setShowLogoutModal(true); }}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                        <LogOut size={16} /> Cerrar Sesión del Usuario
                    </button>
                </div>

                <div style={{ textAlign: 'center', padding: '30px 20px', opacity: 0.9 }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '2px', color: 'white' }}>UT STAR Catastro v{APP_VERSION}</div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#94a3b8' }}>© 2026 • SOPÓ, COLOMBIA</div>
                    <button
                        onClick={forceHardReload}
                        style={{
                            background: '#3b82f6',
                            border: 'none',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            marginTop: '20px',
                            cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(59,132,255,0.5)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        🚀 Forzar actualización manual
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigPage;
