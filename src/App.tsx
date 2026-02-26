import React, { useState } from 'react';
import PozoHeader from './components/PozoHeader';
import TuberiasForm from './components/TuberiasForm';
import GeometriaPozo from './components/GeometriaPozo';
import FotosZone from './components/FotosZone';
import { EyeOff, Eye, Save, LayoutGrid } from 'lucide-react';

const App: React.FC = () => {
    const [headerData, setHeaderData] = useState({
        municipio: 'Sopó',
        pozoNo: '',
        estado: 'Sin represamiento'
    });

    const [isOculto, setIsOculto] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'local' | 'nube' | 'syncing' | 'error'>('local');
    const [geometria, setGeometria] = useState({ diametro: 1.2, altura: 2.5, pendiente: 0 });

    const handleDataChange = (data: { municipio: string; pozoNo: string; estado: string }) => {
        setHeaderData(data);
    };

    return (
        <div className="min-h-screen bg-[#010409] text-[#E8EEFF] font-sans pb-20">
            <PozoHeader
                onDataChange={handleDataChange}
                syncStatus={syncStatus}
            />

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                {/* Quick Actions Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between bg-[#0d1117] border border-[#30363d] p-4 rounded-xl gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setIsOculto(!isOculto)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md font-bold text-xs transition-all flex-1 md:flex-none ${isOculto
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                : 'bg-[#161b22] text-gray-400 border border-[#30363d] hover:text-white'
                                }`}
                        >
                            {isOculto ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            SISTEMA {isOculto ? 'OCULTO' : 'VISIBLE'}
                        </button>
                        <div className="hidden md:block h-4 w-[1px] bg-[#30363d]" />
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                            Pozo: <span className="text-blue-400 font-bold">{headerData.pozoNo || '---'}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-[#161b22] px-3 py-2 rounded-md border border-[#30363d] text-[10px] font-mono font-bold text-purple-400">
                            <LayoutGrid className="w-3 h-3" />
                            DIM: {geometria.diametro}x{geometria.altura}
                        </div>
                        <button
                            disabled={!headerData.pozoNo}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed px-6 py-2 rounded-md font-bold text-sm transition-all shadow-lg flex-1 md:flex-none"
                        >
                            <Save className="w-4 h-4" />
                            RECIBIR FICHA
                        </button>
                    </div>
                </div>

                {/* Dynamic Forms Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                    <div className="xl:col-span-1 h-full">
                        <GeometriaPozo
                            pozoEstado={headerData.estado}
                            onChange={setGeometria}
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <TuberiasForm
                            pozoEstado={headerData.estado}
                            isOculto={isOculto}
                        />
                    </div>
                </div>

                {/* Photos Section */}
                <FotosZone />

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
          background-color: #010409;
        }

        .font-syne {
          font-family: 'Syne', sans-serif;
        }

        /* Custom Scrollbar for dark theme */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0d1117;
        }
        ::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
      ` }} />
        </div>
    );
};

export default App;
