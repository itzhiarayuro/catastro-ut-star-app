import React, { useState, useEffect } from 'react';
import PozoHeader from './components/PozoHeader';
import TuberiasForm from './components/TuberiasForm';
import GeometriaPozo from './components/GeometriaPozo';
import FotosZone from './components/FotosZone';
import { useFirestoreDoc } from './lib/firebase';
import { EyeOff, Eye, Save, LayoutGrid, CloudSync, Wifi, WifiOff } from 'lucide-react';

const App: React.FC = () => {
    // Local State
    const [headerData, setHeaderData] = useState({
        municipio: 'Sopó',
        pozoNo: '',
        estado: 'Sin represamiento'
    });
    const [isOculto, setIsOculto] = useState(false);
    const [geometria, setGeometria] = useState({ diametro: 1.2, altura: 2.5, pendiente: 0 });
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Dynamic Firestore Path
    const firestorePath = headerData.pozoNo
        ? `proyectos/${headerData.municipio.toLowerCase()}/pozos/${headerData.pozoNo}`
        : '';

    const { data: remoteData, saveData, loading } = useFirestoreDoc(firestorePath);

    // Sync remote data to local state when pozoNo changes or remote data updates
    useEffect(() => {
        if (remoteData) {
            if (remoteData.header) setHeaderData(prev => ({ ...prev, ...remoteData.header }));
            if (remoteData.geometria) setGeometria(remoteData.geometria);
            // Notes: Tuberias and Fotos would typically be managed by the forms, 
            // but for this demo, we're focusing on the bridge logic.
        }
    }, [remoteData]);

    // Connection Monitor
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleDataChange = (data: { municipio: string; pozoNo: string; estado: string }) => {
        setHeaderData(data);
    };

    const handleFinalSave = async () => {
        if (!headerData.pozoNo) return;

        const fullPayload = {
            header: {
                ...headerData,
                fechaUpdate: new Date().toISOString(),
                operador: "Antigravity_Agent_121"
            },
            geometria,
            sistemaOculto: isOculto,
            // Las tuberías y fotos se integrarían aquí en un entorno productivo
            // conectando los estados de sus respectivos componentes
        };

        try {
            await saveData(fullPayload);
            alert(`Sincronización exitosa [ID: ${headerData.pozoNo}]`);
        } catch (err) {
            alert("Error en sincronización. Los datos se guardaron localmente.");
        }
    };

    return (
        <div className="min-h-screen bg-[#010409] text-[#E8EEFF] font-sans pb-20">
            <PozoHeader
                onDataChange={handleDataChange}
                syncStatus={isOnline ? 'nube' : 'local'}
            />

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                {/* Realtime Status Bar */}
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

                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${isOnline ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {isOnline ? 'En línea' : 'Modo Offline'}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {loading && headerData.pozoNo && (
                            <div className="flex items-center gap-2 text-blue-400 animate-pulse text-xs font-bold">
                                <CloudSync className="w-4 h-4" /> RECUPEANDO...
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-[#161b22] px-3 py-2 rounded-md border border-[#30363d] text-[10px] font-mono font-bold text-purple-400">
                            <LayoutGrid className="w-3 h-3" />
                            DIM: {geometria.diametro}x{geometria.altura}
                        </div>
                        <button
                            onClick={handleFinalSave}
                            disabled={!headerData.pozoNo}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed px-6 py-2 rounded-md font-bold text-sm transition-all shadow-lg flex-1 md:flex-none"
                        >
                            <Save className="w-4 h-4" />
                            SINCRONIZAR
                        </button>
                    </div>
                </div>

                {/* Dynamic Forms Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                    <div className="xl:col-span-1">
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

                <FotosZone />

                <footer className="py-10 text-center opacity-30 pointer-events-none">
                    <p className="text-[10px] uppercase tracking-[0.2em]">Firestore Realtime Sync &bull; Offline Persistence Active</p>
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
