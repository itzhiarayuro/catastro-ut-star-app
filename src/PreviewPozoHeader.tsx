import React, { useState } from 'react';
import PozoHeader from './components/PozoHeader';

const PreviewPozoHeader: React.FC = () => {
    const [headerData, setHeaderData] = useState({
        municipio: 'Sopó',
        pozoNo: '',
        estado: 'Sin represamiento'
    });

    const [syncStatus, setSyncStatus] = useState<'local' | 'nube' | 'syncing' | 'error'>('local');

    return (
        <div className="min-h-screen bg-[#010409] text-white">
            <PozoHeader
                onDataChange={setHeaderData}
                syncStatus={syncStatus}
            />

            <main className="p-10 max-w-4xl mx-auto space-y-8">
                <section className="bg-[#0d1117] border border-[#30363d] rounded-xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold mb-6 text-[#E8EEFF]" style={{ fontFamily: 'Syne, sans-serif' }}>
                        Estado del Componente (Live Data)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
                                <p className="text-sm text-gray-400 mb-1">Municipio Seleccionado</p>
                                <p className="text-lg font-semibold text-blue-400">{headerData.municipio}</p>
                            </div>

                            <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
                                <p className="text-sm text-gray-400 mb-1">Pozo No.</p>
                                <p className={`text-lg font-semibold ${headerData.pozoNo ? 'text-green-400' : 'text-red-400'}`}>
                                    {headerData.pozoNo || 'REQUERIDO'}
                                </p>
                            </div>

                            <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
                                <p className="text-sm text-gray-400 mb-1">Estado de Operación</p>
                                <p className="text-lg font-semibold text-orange-400">{headerData.estado}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-300">Simular Sincronización</h3>
                            <div className="flex flex-wrap gap-2">
                                {(['local', 'syncing', 'nube', 'error'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setSyncStatus(status)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${syncStatus === status
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'bg-[#21262d] text-gray-400 hover:text-white border border-[#30363d]'
                                            }`}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-xs text-blue-300 leading-relaxed">
                                    Nota: El indicador de sincronización en el header se atenúa y se bloquea visualmente si el campo "Pozo No." está vacío, reforzando la regla de negocio de que no se puede sincronizar un registro sin identificador.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] flex flex-col items-center text-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full" />
                        </div>
                        <h4 className="font-bold">Sticky Design</h4>
                        <p className="text-xs text-gray-500">Se mantiene en la parte superior al hacer scroll.</p>
                    </div>

                    <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] flex flex-col items-center text-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full" />
                        </div>
                        <h4 className="font-bold">GitHub Theme</h4>
                        <p className="text-xs text-gray-500">Colores y bordes inspirados en el modo oscuro de GitHub.</p>
                    </div>

                    <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] flex flex-col items-center text-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mb-2">
                            <div className="w-4 h-4 bg-cyan-500 rounded-full" />
                        </div>
                        <h4 className="font-bold">Syne Bold</h4>
                        <p className="text-xs text-gray-500">Tipografía premium importada dinámicamente.</p>
                    </div>
                </section>
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap');
        body { margin: 0; padding: 0; }
      ` }} />
        </div>
    );
};

export default PreviewPozoHeader;
