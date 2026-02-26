import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Camera, MapPin, AlertTriangle, Lock } from 'lucide-react';

interface Tuberia {
    id: string;
    label: string;
    tipo: 'Entrada' | 'Salida' | 'Sumidero';
    diametro: number;
    unidad: 'mm' | 'pulg';
    material: string;
    estado: string;
    z: number;
    foto?: string;
    metadata?: {
        gps: string;
        timestamp: string;
    };
}

interface TuberiasFormProps {
    pozoEstado?: string;
    isOculto?: boolean;
}

const TuberiasForm: React.FC<TuberiasFormProps> = ({ pozoEstado, isOculto = false }) => {
    const [tuberias, setTuberias] = useState<Tuberia[]>([]);

    const MATERIALS = ['PVC', 'Concreto', 'Gres', 'Novafort', 'HDPE', 'DESCONOCIDO'];
    const ESTADOS = ['Bueno', 'Regular', 'Malo', 'Colmatado', 'Obstruido', 'Sellado'];

    const getLimit = (tipo: Tuberia['tipo']) => {
        if (tipo === 'Entrada') return 7;
        if (tipo === 'Salida') return 2;
        return 6; // Sumideros
    };

    const getNextLabel = (tipo: Tuberia['tipo']) => {
        const prefix = tipo === 'Entrada' ? 'E' : tipo === 'Salida' ? 'S' : 'Sum';
        const count = tuberias.filter(t => t.tipo === tipo).length + 1;
        return `${prefix}${count}`;
    };

    const addTuberia = (tipo: Tuberia['tipo']) => {
        const currentCount = tuberias.filter(t => t.tipo === tipo).length;
        if (currentCount >= getLimit(tipo)) return;

        const newTuberia: Tuberia = {
            id: Math.random().toString(36).substr(2, 9),
            label: getNextLabel(tipo),
            tipo,
            diametro: 0,
            unidad: 'mm',
            material: pozoEstado === 'Sellado' ? 'DESCONOCIDO' : 'PVC',
            estado: pozoEstado === 'Sellado' ? 'Sellado' : 'Bueno',
            z: 0,
        };

        setTuberias([...tuberias, newTuberia]);
    };

    const removeTuberia = (id: string, tipo: Tuberia['tipo']) => {
        const filtered = tuberias.filter(t => t.id !== id);
        // Re-label same types to maintain order E1, E2...
        const relabeled = filtered.map(t => {
            if (t.tipo !== tipo) return t;
            const indexInType = filtered.filter(f => f.tipo === tipo && filtered.indexOf(f) <= filtered.indexOf(t)).length;
            const prefix = t.tipo === 'Entrada' ? 'E' : t.tipo === 'Salida' ? 'S' : 'Sum';
            return { ...t, label: `${prefix}${indexInType}` };
        });
        setTuberias(relabeled);
    };

    const updateTuberia = (id: string, field: keyof Tuberia, value: any) => {
        setTuberias(tuberias.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const calculateZPlusO = (t: Tuberia) => {
        if (!t.diametro || !t.z) return 0;
        const dInMeters = t.unidad === 'mm' ? t.diametro / 1000 : (t.diametro * 25.4) / 1000;
        return (parseFloat(t.z.toString()) + dInMeters).toFixed(3);
    };

    const isLocked = isOculto || pozoEstado === 'Sellado';

    return (
        <div className="bg-[#0d1117] text-[#E8EEFF] p-6 rounded-xl border border-[#30363d] shadow-2xl mt-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Plus className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-syne" style={{ fontFamily: 'Syne, sans-serif' }}>Tuberías e Interconexiones</h2>
                        <p className="text-xs text-gray-500">Gestión dinámica de entradas, salidas y sumideros</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {(['Entrada', 'Salida', 'Sumidero'] as const).map(tipo => (
                        <button
                            key={tipo}
                            onClick={() => addTuberia(tipo)}
                            disabled={tuberias.filter(t => t.tipo === tipo).length >= getLimit(tipo) || isOculto}
                            className="px-4 py-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-md text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> {tipo}
                        </button>
                    ))}
                </div>
            </div>

            {isOculto && (
                <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-3 animate-pulse">
                    <Lock className="w-5 h-5 text-orange-400" />
                    <p className="text-sm text-orange-200">Sistema Marcado como OCULTO. Edición deshabilitada.</p>
                </div>
            )}

            <div className="space-y-4">
                {tuberias.length === 0 ? (
                    <div className="py-20 border-2 border-dashed border-[#30363d] rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
                        <AlertTriangle className="w-8 h-8 opacity-20" />
                        <p className="text-sm">No se han registrado tuberías aún</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {tuberias.map((t) => (
                            <div
                                key={t.id}
                                className={`flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border transition-all ${t.tipo === 'Salida' ? 'bg-blue-500/5 border-blue-500/20' :
                                    t.tipo === 'Sumidero' ? 'bg-cyan-500/5 border-cyan-500/20' :
                                        'bg-[#161b22] border-[#30363d]'
                                    } ${isLocked ? 'grayscale-[0.5]' : ''}`}
                            >
                                {/* ID Tag */}
                                <div className={`px-3 py-1 rounded-full font-bold text-xs min-w-[45px] text-center ${t.tipo === 'Salida' ? 'bg-blue-500 text-white' :
                                    t.tipo === 'Sumidero' ? 'bg-cyan-500 text-white' :
                                        'bg-gray-600 text-white'
                                    }`}>
                                    {t.label}
                                </div>

                                {/* Ø Input */}
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase text-gray-500 block mb-1">Diámetro</label>
                                        <div className="flex bg-[#0d1117] border border-[#30363d] rounded-md overflow-hidden">
                                            <input
                                                type="number"
                                                disabled={isLocked}
                                                value={t.diametro || ''}
                                                onChange={(e) => updateTuberia(t.id, 'diametro', e.target.value)}
                                                className="w-full bg-transparent px-2 py-1 outline-none text-sm"
                                                placeholder="0"
                                            />
                                            <select
                                                disabled={isLocked}
                                                value={t.unidad}
                                                onChange={(e) => updateTuberia(t.id, 'unidad', e.target.value)}
                                                className="bg-[#21262d] text-xs px-2 border-l border-[#30363d] outline-none"
                                            >
                                                <option value="mm">mm</option>
                                                <option value="pulg">pulg</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Material */}
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase text-gray-500 block mb-1">Material</label>
                                    <select
                                        disabled={isLocked}
                                        value={t.material}
                                        onChange={(e) => updateTuberia(t.id, 'material', e.target.value)}
                                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-sm outline-none"
                                    >
                                        {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                {/* Estado */}
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase text-gray-500 block mb-1">Estado</label>
                                    <select
                                        disabled={isLocked}
                                        value={t.estado}
                                        onChange={(e) => updateTuberia(t.id, 'estado', e.target.value)}
                                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-sm outline-none"
                                    >
                                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>

                                {/* Z (m) - Readonly as requested */}
                                <div className="w-24">
                                    <label className="text-[10px] uppercase text-gray-500 block mb-1">Z Invert (m)</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={t.z || '0.000'}
                                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-sm outline-none text-green-400 font-mono"
                                    />
                                </div>

                                {/* Z + Ø */}
                                <div className="w-24">
                                    <label className="text-[10px] uppercase text-gray-500 block mb-1">Cota Lomo</label>
                                    <div className="w-full bg-[#0d1117]/50 border border-[#30363d] rounded-md px-2 py-1 text-sm text-blue-400 font-mono">
                                        {calculateZPlusO(t)}
                                    </div>
                                </div>

                                {/* Photo & GPS Mock */}
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={isLocked}
                                        className="p-2 bg-[#21262d] hover:bg-[#30363d] rounded-md text-gray-400 hover:text-white transition-all relative group"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20">Foto EXIF (Auto)</span>
                                    </button>
                                    <button
                                        disabled={isLocked}
                                        className="p-2 bg-[#21262d] hover:bg-[#30363d] rounded-md text-blue-400 transition-all relative group"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20">GPS Activo</span>
                                    </button>

                                    <button
                                        onClick={() => removeTuberia(t.id, t.tipo)}
                                        disabled={isLocked}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-all ml-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between text-[10px] text-gray-500 border-t border-[#30363d] pt-4">
                <div className="flex gap-4">
                    <span>E: {tuberias.filter(t => t.tipo === 'Entrada').length}/7</span>
                    <span>S: {tuberias.filter(t => t.tipo === 'Salida').length}/2</span>
                    <span>Sum: {tuberias.filter(t => t.tipo === 'Sumidero').length}/6</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span>Validación EXIF: ON</span>
                </div>
            </div>
        </div>
    );
};

export default TuberiasForm;
