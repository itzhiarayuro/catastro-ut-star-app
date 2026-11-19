import React from 'react';
import {
    Home, List, MapPin, Settings as SettingsIcon, FileText
} from 'lucide-react';
import { AppState } from '../types/catastro';
import { ScreenName } from '../hooks/useAppStore';
import { isGlobalFichaEditor } from '../utils/accessPolicy';

interface BottomNavProps {
    activeScreen: ScreenName;
    setActiveScreen: (screen: ScreenName) => void;
    fichas: Record<string, AppState>;
    userEmail?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({
    activeScreen, setActiveScreen, fichas, userEmail
}) => {
    const activeFichasCount = Object.values(fichas).filter(f => !f.deleted).length;
    const isAdmin = isGlobalFichaEditor(userEmail);

    return (
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
                    {activeFichasCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-blue-500 text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-[#020617] font-black">
                            {activeFichasCount}
                        </span>
                    )}
                </div>
                <span>Fichas</span>
            </button>
            {(isAdmin || activeScreen === 'sFichasViewer') && (
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
    );
};

export default BottomNav;
