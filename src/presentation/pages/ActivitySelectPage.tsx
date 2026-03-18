import React from 'react';
import { Search, Flag, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';

interface ActivitySelectPageProps {
    setMarcacionMode: (mode: 'PZ' | 'SUMIDERO' | 'OTRO') => void;
}

const ActivitySelectPage: React.FC<ActivitySelectPageProps> = ({ setMarcacionMode }) => {
    const { activeScreen, setActiveScreen } = useAppStore();

    return (
        <div id="sActivity" className={`screen ${activeScreen === 'sActivity' ? 'active' : ''} `}
            style={{
                background: 'radial-gradient(circle at top right, #0f172a, #020617)'
            }}>
            <div style={{ padding: '40px 20px', width: '100%', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ marginBottom: '24px' }}>
                    <img src="/logo-ut-star.png" alt="UT STAR Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,132,255,0.3)' }} />
                </div>

                <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', marginBottom: '6px', fontFamily: "'Syne', sans-serif" }}>Selección de Actividad</h2>
                <p style={{ color: 'var(--text3)', fontSize: '12px', marginBottom: '32px' }}>Selecciona el módulo para iniciar el trabajo de hoy</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    {/* Investigación */}
                    <button
                        onClick={() => setActiveScreen('s0')}
                        style={{
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '20px',
                            padding: '22px 20px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '18px',
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                            boxShadow: '0 4px 24px rgba(59,130,246,0.1)',
                            width: '100%'
                        }}
                    >
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: '14px', borderRadius: '14px', color: 'white', flexShrink: 0 }}>
                            <Search size={26} />
                        </div>
                        <div>
                            <div style={{ color: 'white', fontWeight: '700', fontSize: '16px', fontFamily: "'Syne', sans-serif" }}>Actividad Investigación</div>
                            <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Catastro &amp; Alcantarillado</div>
                        </div>
                        <ChevronRight style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }} />
                    </button>

                    {/* Marcación PZ */}
                    <button
                        onClick={() => { setMarcacionMode('PZ'); setActiveScreen('sMarcacion'); }}
                        style={{
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '20px',
                            padding: '22px 20px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '18px',
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                            boxShadow: '0 4px 24px rgba(245,158,11,0.1)',
                            width: '100%'
                        }}
                    >
                        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', padding: '14px', borderRadius: '14px', color: 'white', flexShrink: 0 }}>
                            <Flag size={26} />
                        </div>
                        <div>
                            <div style={{ color: 'white', fontWeight: '700', fontSize: '16px', fontFamily: "'Syne', sans-serif" }}>Actividad Marcación PZ</div>
                            <div style={{ color: '#fbbf24', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Georreferenciación Pozos</div>
                        </div>
                        <ChevronRight style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }} />
                    </button>

                    {/* Marcación Sumidero */}
                    <button
                        onClick={() => { setMarcacionMode('SUMIDERO'); setActiveScreen('sMarcacion'); }}
                        style={{
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '20px',
                            padding: '22px 20px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '18px',
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                            boxShadow: '0 4px 24px rgba(16,185,129,0.1)',
                            width: '100%'
                        }}
                    >
                        <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: '14px', borderRadius: '14px', color: 'white', flexShrink: 0 }}>
                            <Flag size={26} />
                        </div>
                        <div>
                            <div style={{ color: 'white', fontWeight: '700', fontSize: '16px', fontFamily: "'Syne', sans-serif" }}>Actividad Marcación Sumidero</div>
                            <div style={{ color: '#34d399', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Georreferenciación Sumideros</div>
                        </div>
                        <ChevronRight style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }} />
                    </button>
                    
                    {/* Botón Volver al Portal */}
                    <button
                        onClick={() => setActiveScreen('sPortal')}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '20px',
                            padding: '16px',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            letterSpacing: '2px',
                            marginTop: '20px',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                        }}
                    >
                        Volver al Portal de Sistemas
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivitySelectPage;
