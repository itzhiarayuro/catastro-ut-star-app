import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import FichasViewerComponent from '../../components/FichasViewer';
import { safeLocalStorageSet } from '../../utils/ui';

interface FichasViewerPageProps {
    toast: (msg: string) => void;
    handlePDF: (ficha: any) => void;
    pdfLoading: boolean;
}

const FichasViewerPage: React.FC<FichasViewerPageProps> = ({ toast, handlePDF, pdfLoading }) => {
    const { activeScreen, setActiveScreen, setState, setCurrentStep } = useAppStore();

    const handleEditFicha = (ficha: any) => {
        setState(ficha);
        safeLocalStorageSet('catastro_draft', JSON.stringify(ficha));
        setActiveScreen('sForm');
        setCurrentStep(1);
        toast('✏️ Editando ficha (Modo Local)');
    };

    return (
        <div id="sFichasViewer" className={`screen ${activeScreen === 'sFichasViewer' ? 'active' : ''}`}>
            <div className="app-header">
                <div className="header-inner">
                    <button onClick={() => setActiveScreen('sPortal')} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Sistema de Fichas</div>
                        <div className="header-sub">GESTIÓN & EXPORTACIÓN PDF</div>
                    </div>
                </div>
            </div>
            <div className="content" style={{ padding: '12px' }}>
                <FichasViewerComponent 
                    toast={toast} 
                    handlePDF={handlePDF} 
                    pdfLoading={pdfLoading} 
                    onEditFicha={handleEditFicha}
                />
            </div>
        </div>
    );
};

export default FichasViewerPage;
