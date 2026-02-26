import React, { useState } from 'react';
import { Ruler, ArrowUpDown, Percent, Info } from 'lucide-react';

interface GeometriaPozoProps {
    pozoEstado?: string;
    onChange?: (data: { diametro: number; altura: number; pendiente: number }) => void;
}

const GeometriaPozo: React.FC<GeometriaPozoProps> = ({ pozoEstado, onChange }) => {
    const [diametro, setDiametro] = useState(1.2);
    const [altura, setAltura] = useState(2.5);
    const [pendiente, setPendiente] = useState(0);

    const handleUpdate = (field: 'diametro' | 'altura' | 'pendiente', value: number) => {
        let finalValue = value;
        if (field === 'diametro') {
            finalValue = Math.max(0.1, parseFloat(value.toFixed(1)));
            setDiametro(finalValue);
        } else if (field === 'altura') {
            finalValue = Math.max(0.25, parseFloat(value.toFixed(2)));
            setAltura(finalValue);
        } else {
            setPendiente(value);
        }

        onChange?.({
            diametro: field === 'diametro' ? finalValue : diametro,
            altura: field === 'altura' ? finalValue : altura,
            pendiente: field === 'pendiente' ? finalValue : pendiente
        });
    };

    // SVG Scaling factors
    const svgWidth = 200;
    const svgHeight = 250;
    const scale = 40; // pixels per meter

    const drawWidth = Math.min(svgWidth - 40, diametro * scale);
    const drawHeight = Math.min(svgHeight - 60, altura * scale);

    return (
        <div className="bg-[#0d1117] text-[#E8EEFF] p-6 rounded-xl border border-[#30363d] shadow-2xl h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Ruler className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-syne" style={{ fontFamily: 'Syne, sans-serif' }}>Geometría del Pozo</h2>
                    <p className="text-xs text-gray-500">Dimensiones y pendientes internas</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-center">
                {/* Controls */}
                <div className="flex-1 space-y-6 w-full">
                    {/* Diámetro */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <ArrowUpDown className="w-3 h-3 rotate-90" /> Diámetro (m)
                            </label>
                            <span className="text-2xl font-bold text-white font-mono">{diametro.toFixed(1)}m</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleUpdate('diametro', diametro - 0.1)}
                                className="flex-1 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] py-2 rounded-md font-bold transition-all"
                            >-</button>
                            <button
                                onClick={() => handleUpdate('diametro', diametro + 0.1)}
                                className="flex-1 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] py-2 rounded-md font-bold transition-all"
                            >+</button>
                        </div>
                    </div>

                    {/* Altura */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <ArrowUpDown className="w-3 h-3" /> Altura (m)
                            </label>
                            <span className="text-2xl font-bold text-white font-mono">{altura.toFixed(2)}m</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleUpdate('altura', altura - 0.25)}
                                className="flex-1 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] py-2 rounded-md font-bold transition-all"
                            >-</button>
                            <button
                                onClick={() => handleUpdate('altura', altura + 0.25)}
                                className="flex-1 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] py-2 rounded-md font-bold transition-all"
                            >+</button>
                        </div>
                    </div>

                    {/* Pendiente */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Percent className="w-3 h-3" /> Pendiente (%)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={pendiente}
                                onChange={(e) => handleUpdate('pendiente', parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-3 text-lg font-mono outline-none focus:border-purple-500 transition-all"
                                placeholder="0.0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                        </div>
                    </div>

                    {pozoEstado === 'Sin represamiento' && (
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex gap-2 items-start">
                            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                            <p className="text-[10px] text-blue-300 leading-relaxed uppercase font-semibold">
                                Validación: Estado óptimo analizado. Valores "Desconocidos" deshabilitados por integridad de datos.
                            </p>
                        </div>
                    )}
                </div>

                {/* SVG Diagram */}
                <div className="w-[200px] h-[250px] bg-[#161b22] rounded-xl border border-[#30363d] p-4 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-2 left-2 text-[10px] text-gray-600 font-mono tracking-tighter opacity-50 uppercase">Diagrama Dinámico</div>
                    <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="drop-shadow-2xl">
                        {/* Ground Line */}
                        <line x1="10" y1="40" x2={svgWidth - 10} y2="40" stroke="#30363d" strokeWidth="2" strokeDasharray="4 4" />

                        {/* Manhole Body */}
                        <rect
                            x={(svgWidth - drawWidth) / 2}
                            y="40"
                            width={drawWidth}
                            height={drawHeight}
                            fill="url(#pozoGrad)"
                            stroke="#A855F7"
                            strokeWidth="2"
                            className="transition-all duration-300"
                        />

                        {/* Labels */}
                        <text x={svgWidth / 2} y="30" textAnchor="middle" fill="#A855F7" fontSize="10" fontWeight="bold">ø {diametro.toFixed(1)}m</text>
                        <text
                            x={(svgWidth - drawWidth) / 2 - 10}
                            y={40 + drawHeight / 2}
                            textAnchor="middle"
                            fill="#A855F7"
                            fontSize="10"
                            fontWeight="bold"
                            transform={`rotate(-90 ${(svgWidth - drawWidth) / 2 - 10} ${40 + drawHeight / 2})`}
                        >
                            H {altura.toFixed(2)}m
                        </text>

                        <defs>
                            <linearGradient id="pozoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.02" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default GeometriaPozo;
