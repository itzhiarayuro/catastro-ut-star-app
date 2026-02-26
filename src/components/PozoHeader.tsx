import React, { useState } from 'react';
import {
    ChevronDown,
    Database,
    Cloud,
    CheckCircle2,
    AlertCircle,
    Hash
} from 'lucide-react';

interface PozoHeaderProps {
    onDataChange?: (data: { municipio: string; pozoNo: string; estado: string }) => void;
    syncStatus?: 'local' | 'nube' | 'syncing' | 'error';
}

const PozoHeader: React.FC<PozoHeaderProps> = ({
    onDataChange,
    syncStatus = 'local'
}) => {
    const [municipio, setMunicipio] = useState('Sopó');
    const [pozoNo, setPozoNo] = useState('');
    const [estado, setEstado] = useState('Sin represamiento');
    const [isMunicipioOpen, setIsMunicipioOpen] = useState(false);
    const [isEstadoOpen, setIsEstadoOpen] = useState(false);

    const municipios = ['Sopó', 'Sibaté', 'Granada'];
    const estados = ['Sin represamiento', 'Inundado', 'Colmatado', 'Sellado'];

    const handleMunicipioSelect = (m: string) => {
        setMunicipio(m);
        setIsMunicipioOpen(false);
        onDataChange?.({ municipio: m, pozoNo, estado });
    };

    const handleEstadoSelect = (e: string) => {
        setEstado(e);
        setIsEstadoOpen(false);
        onDataChange?.({ municipio, pozoNo, estado: e });
    };

    const handlePozoNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPozoNo(val);
        onDataChange?.({ municipio, pozoNo: val, estado });
    };

    const getSyncIcon = () => {
        switch (syncStatus) {
            case 'nube': return <Cloud className="w-4 h-4 text-blue-400" />;
            case 'syncing': return <Database className="w-4 h-4 text-yellow-400 animate-pulse" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <Database className="w-4 h-4 text-green-400" />;
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full bg-[#0D1117] border-b border-[#30363d] text-[#E8EEFF] px-4 py-3 flex items-center justify-between shadow-xl">
            {/* Left Section: Logo & Title */}
            <div className="flex items-center gap-4">
                <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#10B981] via-[#3B82F6] to-[#06B6D4] flex items-center justify-center font-bold text-white shadow-lg">
                    UT
                </div>
                <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Ficha Catastro ALC
                </h1>
            </div>

            {/* Middle Section: Selectors & Input */}
            <div className="flex items-center gap-3">
                {/* Municipio Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsMunicipioOpen(!isMunicipioOpen)}
                        className="flex items-center gap-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] px-3 py-1.5 rounded-md transition-all duration-200 min-w-[120px] justify-between"
                    >
                        <span>{municipio}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isMunicipioOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isMunicipioOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-[60] overflow-hidden">
                            {municipios.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => handleMunicipioSelect(m)}
                                    className="w-full text-left px-3 py-2 hover:bg-[#21262d] transition-colors text-sm"
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pozo No. Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash className={`w-4 h-4 ${!pozoNo ? 'text-red-400' : 'text-gray-400'}`} />
                    </div>
                    <input
                        type="text"
                        value={pozoNo}
                        onChange={handlePozoNoChange}
                        placeholder="Pozo No."
                        className={`bg-[#0d1117] border ${!pozoNo ? 'border-red-500/50 focus:border-red-500' : 'border-[#30363d] focus:border-blue-500'} pl-9 pr-3 py-1.5 rounded-md outline-none transition-all duration-200 text-sm`}
                    />
                </div>

                {/* Estado Selector */}
                <div className="relative">
                    <button
                        onClick={() => setIsEstadoOpen(!isEstadoOpen)}
                        className="flex items-center gap-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] px-3 py-1.5 rounded-md transition-all duration-200 min-w-[160px] justify-between"
                    >
                        <span className="truncate">{estado}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isEstadoOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isEstadoOpen && (
                        <div className="absolute top-full right-0 mt-1 w-[200px] bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-[60] overflow-hidden">
                            {estados.map((e) => (
                                <button
                                    key={e}
                                    onClick={() => handleEstadoSelect(e)}
                                    className="w-full text-left px-3 py-2 hover:bg-[#21262d] transition-colors text-sm flex items-center gap-2"
                                >
                                    <div className={`w-2 h-2 rounded-full ${e === 'Sin represamiento' ? 'bg-green-500' :
                                            e === 'Inundado' ? 'bg-blue-500' :
                                                e === 'Colmatado' ? 'bg-orange-500' : 'bg-red-500'
                                        }`} />
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section: Sync Indicator */}
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-full transition-all duration-300 ${!pozoNo ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-blue-500/50 cursor-pointer'}`}>
                    {getSyncIcon()}
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        {syncStatus === 'local' ? 'Local' : syncStatus === 'nube' ? 'Nube' : syncStatus === 'syncing' ? 'Sincronizando' : 'Error'}
                    </span>
                    {syncStatus === 'local' && pozoNo && (
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap');
      ` }} />
        </header>
    );
};

export default PozoHeader;
