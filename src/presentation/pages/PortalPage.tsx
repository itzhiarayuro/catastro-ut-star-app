import React from 'react';
import { Camera, FileText, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/firebase';
import { useAppStore } from '../../hooks/useAppStore';

interface PortalPageProps {
    setShowLogoutModal: (show: boolean) => void;
}

const PortalPage: React.FC<PortalPageProps> = ({ setShowLogoutModal }) => {
    const { user } = useAuth();
    const { activeScreen, setActiveScreen } = useAppStore();

    return (
        <div id="sPortal" className={`screen ${activeScreen === 'sPortal' ? 'active' : ''}`}>
            <div className="home-center" style={{ maxWidth: '500px' }}>
                <div className="home-logo-container">
                    <img src="/logo-ut-star.png" alt="UT STAR Logo" className="home-logo-img" />
                </div>
                <div className="mb-8">
                    <div className="home-title" style={{ fontSize: '28px' }}>Portal de <span>Sistemas</span><br />UT STAR</div>
                    <p className="text-gray-400 text-xs mt-2 uppercase tracking-[2px] font-bold">Seleccione un módulo para continuar</p>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* App de Registro (Campo) */}
                    <button
                        onClick={() => setActiveScreen('sActivity')}
                        style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(30, 41, 59, 0.4))',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '24px',
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.2)'
                        }}
                        className="group hover:scale-[1.02] hover:-translate-y-1"
                    >
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: '16px', borderRadius: '18px', color: 'white', flexShrink: 0, boxShadow: '0 8px 20px -5px rgba(59, 130, 246, 0.5)' }}>
                            <Camera size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'white', fontWeight: '800', fontSize: '18px', fontFamily: "'Syne', sans-serif" }}>Sistema de Registro</div>
                            <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Toma de Datos en Campo</div>
                        </div>
                        <ChevronRight className="text-blue-500/30 group-hover:text-blue-400" />
                    </button>

                    {/* Sistema de Fichas (Admin/PDF) */}
                    <button
                        onClick={() => window.open('https://sistema-fichas-tecnicas.web.app', '_blank')}
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(30, 41, 59, 0.4))',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '24px',
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.2)'
                        }}
                        className="group hover:scale-[1.02] hover:-translate-y-1"
                    >
                        <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: '16px', borderRadius: '18px', color: 'white', flexShrink: 0, boxShadow: '0 8px 20px -5px rgba(16, 185, 129, 0.5)' }}>
                            <FileText size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'white', fontWeight: '800', fontSize: '18px', fontFamily: "'Syne', sans-serif" }}>Sistema de Fichas</div>
                            <div style={{ color: '#34d399', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Gestión & Exportación PDF</div>
                        </div>
                        <ChevronRight className="text-green-500/30 group-hover:text-green-400" />
                    </button>
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1.5px', opacity: 0.6 }}>
                        Sesión Iniciada: {user?.name || user?.email}
                    </div>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="flex items-center gap-2 text-[10px] text-red-400 font-black uppercase tracking-widest hover:text-red-300 transition-colors"
                    >
                        <LogOut size={12} /> Salir del Sistema
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PortalPage;
