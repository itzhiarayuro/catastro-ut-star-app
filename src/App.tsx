import React, { useState } from 'react';
import PozoHeader from './components/PozoHeader';
import TuberiasForm from './components/TuberiasForm';
import { EyeOff, Eye, Save } from 'lucide-react';

const App: React.FC = () => {
    const [headerData, setHeaderData] = useState({
        municipio: 'Sopó',
        pozoNo: '',
        estado: 'Sin represamiento'
    });

    const [isOculto, setIsOculto] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'local' | 'nube' | 'syncing' | 'error'>('local');

    const handleDataChange = (data: { municipio: string; pozoNo: string; estado: string }) => {
        setHeaderData(data);
    };

    return (
        <div className="min-h-screen bg-[#010409] text-[#E8EEFF] font-sans">
            <PozoHeader
                onDataChange={handleDataChange}
                syncStatus={syncStatus}
            />

            <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
                {/* Quick Actions Bar */}
                <div className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsOculto(!isOculto)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs transition-all ${isOculto
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                    : 'bg-[#161b22] text-gray-400 border border-[#30363d] hover:text-white'
                                }`}
                        >
                            {isOculto ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            SISTEMA {isOculto ? 'OCULTO' : 'VISIBLE'}
                        </button>
                        <div className="h-4 w-[1px] bg-[#30363d]" />
                        <p className="text-xs text-gray-500">
                            Capturando datos para: <span className="text-blue-400 font-bold">{headerData.pozoNo || '---'}</span>
                        </p>
                    </div>

                    <button
                        disabled={!headerData.pozoNo}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed px-6 py-2 rounded-md font-bold text-sm transition-all shadow-lg"
                    >
                        <Save className="w-4 h-4" />
                        GUARDAR FICHA
                    </button>
                </div>

                {/* Dynamic Forms */}
                <TuberiasForm
                    pozoEstado={headerData.estado}
                    isOculto={isOculto}
                />

                {/* Optional: Design Specs Footer */}
                <footer className="py-10 text-center opacity-30 pointer-events-none">
                    <p className="text-[10px] uppercase tracking-[0.2em]">Antigravity Engine &bull; UT STAR APP &bull; v1.0.4</p>
                </footer>
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }

        .font-syne {
          font-family: 'Syne', sans-serif;
        }
      ` }} />
        </div>
    );
};

export default App;
