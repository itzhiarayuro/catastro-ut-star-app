import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import FichasViewerComponent from '../../components/FichasViewer'; 

const FichasViewerPage: React.FC = () => {
    const { activeScreen, setActiveScreen } = useAppStore();

    return (
        <div id="sFichasViewer" className={`screen ${activeScreen === 'sFichasViewer' ? 'active' : ''}`}>
            <div className="app-header">
                <div className="header-inner">
                    <button onClick={() => setActiveScreen('sPortal')} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Sistema de Fichas</div>
                        <div className="header-sub">GESTIÓN &amp; EXPORTACIÓN PDF</div>
                    </div>
                </div>
            </div>
            <div className="content" style={{ padding: '12px' }}>
                <FichasViewerComponent />
            </div>
        </div>
    );
};

export default FichasViewerPage;
