import React, { useState } from 'react';
import { ChevronRight, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { Pipe, FotoRegistro } from '../../types/catastro';
import ThumbnailImage from '../ThumbnailImage';
import { PipePhotoGroup } from './PipePhotoGroup';

interface PipeCardProps {
    pipe: Pipe;
    index: number;
    onUpdate: (u: Partial<Pipe>) => void;
    onDelete: () => void;
    numFocus: (e: any) => void;
    foto?: any;
    // New props for photos
    photos: FotoRegistro[];
    allPipes: Pipe[];
    onAddPhoto: (foto: FotoRegistro) => void;
    onDeletePhoto: (id: string) => void;
    onPreviewPhoto: (photo: FotoRegistro) => void;
    pozoId: string;
    municipio: string;
    isLocked: boolean;
}

const PipeCard: React.FC<PipeCardProps> = ({ 
    pipe, index, onUpdate, onDelete, numFocus, foto,
    photos, allPipes, onAddPhoto, onDeletePhoto, onPreviewPhoto, pozoId, municipio, isLocked
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Normalización unificada con FotosZone: usa (es || tipo) como fallback
    const getNormalizedType = (p: any) => {
        const raw = p?.es || p?.tipo || 'ENTRADA';
        const up = raw.toUpperCase();
        if (up === 'E' || up === 'ENTRADA') return 'ENTRADA';
        if (up === 'S' || up === 'SALIDA') return 'SALIDA';
        if (up === 'SUM' || up === 'SUMIDERO') return 'SUMIDERO';
        return 'ENTRADA';
    };

    let label = '';
    let isSumidero = false;
    let tipoStr: 'ENTRADA' | 'SALIDA' | 'SUMIDERO' = 'ENTRADA';

    const currentType = getNormalizedType(pipe);
    const sameTypePipes = allPipes.filter(p => getNormalizedType(p) === currentType);
    const typeIndexInGroup = sameTypePipes.findIndex(p => p.id === pipe.id);
    
    // Siempre usar posición dentro del grupo filtrado, nunca el valor guardado
    const typeOrder = typeIndexInGroup !== -1 ? typeIndexInGroup + 1 : 1;
    
    if (currentType === 'SUMIDERO') {
        label = `SUM${typeOrder}`;
        tipoStr = 'SUMIDERO';
        isSumidero = true;
    } else {
        label = `${currentType === 'SALIDA' ? 'S' : 'E'}${typeOrder}`;
        tipoStr = currentType === 'SALIDA' ? 'SALIDA' : 'ENTRADA';
        isSumidero = false;
    }

    return (
        <div className="pipe-card mb-3">
            <div className="pipe-card-header cursor-pointer p-3 bg-gray-900 flex justify-between items-center rounded-t-lg" onClick={() => setIsOpen(!isOpen)}>
                <div className="pipe-card-label flex items-center gap-2">
                    <ThumbnailImage foto={foto} alt={`Tubería ${typeOrder}`} municipio={municipio} />
                    <div className="flex flex-col">
                        <span className={`pipe-badge text-[8px] px-1 py-0.2 rounded font-bold w-fit ${pipe.es === 'ENTRADA' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}`}>{pipe.es}</span>
                        <span className="text-xs font-semibold">Tubería {typeOrder} {pipe.deA && `· ${pipe.deA}`}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        <ChevronRight size={18} />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-500/20 rounded text-red-500">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            
            <div className="pipe-body bg-gray-800/50 p-3 rounded-b-lg border-x border-b border-gray-700" 
                 style={{ display: isOpen ? 'block' : 'none' }}>
                <div className="pipe-toggle flex gap-1 mb-4">
                    <button 
                        type="button"
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-colors ${pipe.es === 'ENTRADA' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`} 
                        onClick={() => onUpdate({ es: 'ENTRADA' })}
                    >
                        <ArrowDown size={14} /> ENTRADA
                    </button>
                    <button 
                        type="button"
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-colors ${pipe.es === 'SALIDA' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'}`} 
                        onClick={() => onUpdate({ es: 'SALIDA' })}
                    >
                        <ArrowUp size={14} /> SALIDA
                    </button>
                </div>

                {/* Integration of Photo Capture directly in Step 4 */}
                <div className="mb-4">
                    <PipePhotoGroup
                        pozoId={pozoId}
                        label={label}
                        tipo={tipoStr}
                        diam={pipe.diam}
                        mat={pipe.mat}
                        isSumidero={isSumidero}
                        photos={photos}
                        onAdd={onAddPhoto}
                        onDelete={onDeletePhoto}
                        onPreview={onPreviewPhoto}
                        isLocked={isLocked}
                        municipio={municipio}
                    />
                </div>
                
                <div className="field-row grid grid-cols-2 gap-3 mb-3">
                    <div className="field">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">De/Hasta</label>
                        <input 
                            type="text" 
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-sm w-full"
                            value={pipe.deA} 
                            onChange={e => onUpdate({ deA: e.target.value })} 
                            placeholder="Ej: P-002" 
                        />
                    </div>
                    <div className="field">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block flex justify-between">
                            Ø
                            <span className="unit-toggle flex bg-gray-900 rounded border border-gray-700 overflow-hidden">
                                <button 
                                    type="button"
                                    className={`px-2 text-[9px] uppercase font-bold ${(!pipe.unit || pipe.unit === 'mm') ? 'active' : ''}`} 
                                    onClick={(e) => { e.preventDefault(); onUpdate({ unit: 'mm' }); }}
                                >mm</button>
                                <button 
                                    type="button"
                                    className={`px-2 text-[9px] uppercase font-bold ${pipe.unit === 'in' ? 'active' : ''}`} 
                                    onClick={(e) => { e.preventDefault(); onUpdate({ unit: 'in' }); }}
                                >in</button>
                            </span>
                        </label>
                        <input 
                            type="number" 
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-sm w-full"
                            value={pipe.diam} 
                            onChange={e => onUpdate({ diam: e.target.value })} 
                            placeholder="0" 
                        />
                    </div>
                </div>
                
                <div className="field-row grid grid-cols-1 gap-3 mb-3">
                    <div className="field">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Material</label>
                        <select 
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-sm w-full"
                            value={pipe.mat && ['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL'].includes(pipe.mat) ? pipe.mat : pipe.mat ? 'OTRO' : ''} 
                            onChange={e => onUpdate({ mat: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}
                        >
                            <option value="">— SELECCIONAR —</option>
                            <option>CONCRETO</option>
                            <option>PVC CORRUGADO</option>
                            <option>PVC LISO</option>
                            <option>PLÁSTICO</option>
                            <option>ASBESTO CEMENTO</option>
                            <option>MAMPOSTERIA</option>
                            <option>GRES</option>
                            <option>GRP</option>
                            <option>METAL</option>
                            <option>OTRO</option>
                        </select>
                        {(!['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL', ''].includes(pipe.mat || '') || pipe.mat === 'OTRO') && (
                            <input
                                type="text"
                                maxLength={60}
                                value={pipe.mat === 'OTRO' ? '' : pipe.mat}
                                onChange={e => onUpdate({ mat: e.target.value.toUpperCase() })}
                                className="mt-2 bg-gray-900 border border-blue-500/30 rounded p-2 text-sm w-full text-blue-400"
                                placeholder="Especifique Material..."
                            />
                        )}
                    </div>
                </div>
                
                <div className="field-row grid grid-cols-2 gap-3 mb-3">
                    <div className="field">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Estado Tub.</label>
                        <select 
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-sm w-full"
                            value={pipe.estado && ['LIMPIO', 'INUNDADO', 'SEDIMENTADO', 'COLMATADO', 'CON BASURAS'].includes(pipe.estado) ? pipe.estado : pipe.estado ? 'OTRO' : ''} 
                            onChange={e => onUpdate({ estado: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}
                        >
                            <option value="">—</option>
                            <option>LIMPIO</option>
                            <option>INUNDADO</option>
                            <option>SEDIMENTADO</option>
                            <option>COLMATADO</option>
                            <option>CON BASURAS</option>
                            <option>OTRO</option>
                        </select>
                        {(!['LIMPIO', 'INUNDADO', 'SEDIMENTADO', 'COLMATADO', 'CON BASURAS', ''].includes(pipe.estado || '') || pipe.estado === 'OTRO') && (
                            <input
                                type="text"
                                value={pipe.estado === 'OTRO' ? '' : pipe.estado}
                                onChange={e => onUpdate({ estado: e.target.value.toUpperCase() })}
                                className="mt-2 bg-gray-900 border border-blue-500/30 rounded p-2 text-[10px] w-full text-blue-400"
                                placeholder="Especifique Estado..."
                            />
                        )}
                    </div>
                    <div className="field">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Emboquillado</label>
                        <select 
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-sm w-full"
                            value={pipe.emboq} 
                            onChange={e => onUpdate({ emboq: e.target.value })}
                        >
                            <option value="">-</option>
                            <option value="SI">SI</option>
                            <option value="NO">NO</option>
                            <option value="DESC">DESC</option>
                        </select>
                    </div>
                </div>
                
                <div className="field-row grid grid-cols-2 gap-3">
                    <div className="field">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Cota Clave Z <span className="text-gray-500 lowercase">m</span></label>
                        <input 
                            type="number" 
                            step="0.01" 
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-sm w-full text-green-400 font-mono"
                            value={pipe.cotaZ} 
                            onFocus={numFocus}
                            onChange={e => onUpdate({ cotaZ: e.target.value })}
                            placeholder="0.00 m" 
                        />
                    </div>
                    <div className="field">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Cota Batea Z+ø <span className="text-gray-500 lowercase">m</span></label>
                        <input
                            type="text"
                            readOnly
                            className="bg-gray-800 border border-transparent rounded p-2 text-sm w-full text-gray-400 font-mono opacity-60"
                            value={(() => {
                                const z = parseFloat(pipe.cotaZ) || 0;
                                let d = parseFloat(pipe.diam) || 0;
                                if (pipe.unit === 'in') d = (d * 25.4);
                                return (z + (d / 1000)).toFixed(3);
                            })()}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PipeCard;

