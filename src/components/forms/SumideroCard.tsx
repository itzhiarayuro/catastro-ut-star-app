import React from 'react';
import { Trash2 } from 'lucide-react';
import { Sumidero, FotoRegistro } from '../../types/catastro';
import ThumbnailImage from '../ThumbnailImage';
import { PipePhotoGroup } from './PipePhotoGroup';

interface SumideroCardProps {
    sum: Sumidero;
    index: number;
    onUpdate: (u: Partial<Sumidero>) => void;
    onDelete: () => void;
    foto?: any;
    // New props for photos
    photos: FotoRegistro[];
    onAddPhoto: (foto: FotoRegistro) => void;
    onDeletePhoto: (id: string) => void;
    onPreviewPhoto: (photo: FotoRegistro) => void;
    pozoId: string;
    isLocked: boolean;
}

const SumideroCard: React.FC<SumideroCardProps> = ({ 
    sum, index, onUpdate, onDelete, foto,
    photos, onAddPhoto, onDeletePhoto, onPreviewPhoto, pozoId, isLocked 
}) => {
    const label = `SUM${index + 1}`;

    return (
        <div className="sum-card bg-gray-900 p-4 rounded-lg border border-gray-800 relative mb-4">
            <button 
                className="del-sum absolute top-2 right-2 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
                <Trash2 size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <ThumbnailImage foto={foto} alt={`Sumidero ${index + 1}`} />
                <div className="comp-section-title text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Sumidero {index + 1} ({sum.codEsquema})
                </div>
            </div>

            {/* Integration of Photo Capture directly in Step 4 */}
            <div className="mb-4">
                <PipePhotoGroup
                    pozoId={pozoId}
                    label={label}
                    tipo="SUMIDERO"
                    diam={sum.diamTub}
                    mat={sum.matTub}
                    isSumidero={true}
                    photos={photos}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    onPreview={onPreviewPhoto}
                    isLocked={isLocked}
                />
            </div>

            <div className="field-row grid grid-cols-2 gap-3 mb-3">
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Cód. Esquema</label>
                    <input 
                        type="text" 
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full"
                        value={sum.codEsquema} 
                        onChange={e => onUpdate({ codEsquema: e.target.value })} 
                        placeholder="S-001" 
                    />
                </div>
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Tipo Sumidero</label>
                    <select 
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full"
                        value={['COMBINADO O MIXTO', 'VENTANA O LATERAL', 'REJILLA', 'RANURADOS', 'TRANSVERSAL'].includes(sum.tipo || '') ? sum.tipo : sum.tipo ? 'OTRO' : ''} 
                        onChange={e => onUpdate({ tipo: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}
                    >
                        <option value="">— SELECCIONAR —</option>
                        <option value="COMBINADO O MIXTO">COMBINADO O MIXTO</option>
                        <option value="VENTANA O LATERAL">VENTANA O LATERAL</option>
                        <option value="REJILLA">REJILLA</option>
                        <option value="RANURADOS">RANURADOS</option>
                        <option value="TRANSVERSAL">TRANSVERSAL</option>
                        <option value="OTRO">OTRO</option>
                    </select>
                    {(!['COMBINADO O MIXTO', 'VENTANA O LATERAL', 'REJILLA', 'RANURADOS', 'TRANSVERSAL', ''].includes(sum.tipo || '') || sum.tipo === 'OTRO') && (
                        <input 
                            type="text" 
                            value={sum.tipo === 'OTRO' ? '' : sum.tipo} 
                            onChange={e => onUpdate({ tipo: e.target.value.toUpperCase() })} 
                            className="mt-2 bg-gray-800 border border-blue-500/30 rounded p-2 text-xs w-full text-blue-400" 
                            placeholder="Especifique..." 
                        />
                    )}
                </div>
            </div>

            <div className="field-row grid grid-cols-2 gap-3 mb-3">
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Estado</label>
                    <select 
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full"
                        value={['SIN REPRESAMIENTO', 'INUNDADO', 'COLMATADO', 'OCULTO'].includes(sum.estado || '') ? sum.estado : sum.estado ? 'OTRO' : ''} 
                        onChange={e => onUpdate({ estado: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}
                    >
                        <option value="">—</option>
                        <option value="SIN REPRESAMIENTO">SIN REPRESAMIENTO</option>
                        <option value="INUNDADO">INUNDADO</option>
                        <option value="COLMATADO">COLMATADO</option>
                        <option value="OCULTO">OCULTO</option>
                        <option value="OTRO">OTRO</option>
                    </select>
                    {(!['SIN REPRESAMIENTO', 'INUNDADO', 'COLMATADO', 'OCULTO', ''].includes(sum.estado || '') || sum.estado === 'OTRO') && (
                        <input 
                            type="text" 
                            value={sum.estado === 'OTRO' ? '' : sum.estado} 
                            onChange={e => onUpdate({ estado: e.target.value.toUpperCase() })} 
                            className="mt-2 bg-gray-800 border border-blue-500/30 rounded p-2 text-xs w-full text-blue-400" 
                            placeholder="Especifique..." 
                        />
                    )}
                </div>
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Mat. Rejilla</label>
                    <select 
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full"
                        value={['DESCONOCIDO', 'CONCRETO', 'METAL DÚCTIL', 'PLÁSTICO REFORZADO'].includes(sum.matRejilla || '') ? sum.matRejilla : sum.matRejilla ? 'OTRO' : ''} 
                        onChange={e => onUpdate({ matRejilla: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}
                    >
                        <option value="">—</option>
                        <option value="DESCONOCIDO">DESCONOCIDO</option>
                        <option value="CONCRETO">CONCRETO</option>
                        <option value="METAL DÚCTIL">METAL DÚCTIL</option>
                        <option value="PLÁSTICO REFORZADO">PLÁSTICO REFORZADO</option>
                        <option value="OTRO">OTRO</option>
                    </select>
                    {(!['DESCONOCIDO', 'CONCRETO', 'METAL DÚCTIL', 'PLÁSTICO REFORZADO', ''].includes(sum.matRejilla || '') || sum.matRejilla === 'OTRO') && (
                        <input 
                            type="text" 
                            maxLength={60} 
                            value={sum.matRejilla === 'OTRO' ? '' : sum.matRejilla} 
                            onChange={e => onUpdate({ matRejilla: e.target.value.toUpperCase() })} 
                            className="mt-2 bg-gray-800 border border-blue-500/30 rounded p-2 text-xs w-full text-blue-400" 
                            placeholder="Especifique..." 
                        />
                    )}
                </div>
            </div>

            <div className="field-row grid grid-cols-2 gap-3 mb-3">
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Mat. Caja</label>
                    <select 
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full"
                        value={['DESCONOCIDO', 'CONCRETO', 'MAMPOSTERIA'].includes(sum.matCaja || '') ? sum.matCaja : sum.matCaja ? 'OTRO' : ''} 
                        onChange={e => onUpdate({ matCaja: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}
                    >
                        <option value="">—</option>
                        <option value="DESCONOCIDO">DESCONOCIDO</option>
                        <option value="CONCRETO">CONCRETO</option>
                        <option value="MAMPOSTERIA">MAMPOSTERIA</option>
                        <option value="OTRO">OTRO</option>
                    </select>
                    {(!['DESCONOCIDO', 'CONCRETO', 'MAMPOSTERIA', ''].includes(sum.matCaja || '') || sum.matCaja === 'OTRO') && (
                        <input 
                            type="text" 
                            value={sum.matCaja === 'OTRO' ? '' : sum.matCaja} 
                            onChange={e => onUpdate({ matCaja: e.target.value.toUpperCase() })} 
                            className="mt-2 bg-gray-800 border border-blue-500/30 rounded p-2 text-xs w-full text-blue-400" 
                            placeholder="Especifique..." 
                        />
                    )}
                </div>
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block flex justify-between">
                        Ø Tub. Salida
                        <span className="unit-toggle flex bg-gray-800 rounded border border-gray-700 overflow-hidden">
                            <button 
                                type="button"
                                className={`px-2 text-[9px] uppercase font-bold ${(!sum.unitTub || sum.unitTub === 'mm') ? 'active' : ''}`} 
                                onClick={(e) => { e.preventDefault(); onUpdate({ unitTub: 'mm' }); }}
                            >mm</button>
                            <button 
                                type="button"
                                className={`px-2 text-[9px] uppercase font-bold ${sum.unitTub === 'in' ? 'active' : ''}`} 
                                onClick={(e) => { e.preventDefault(); onUpdate({ unitTub: 'in' }); }}
                            >in</button>
                        </span>
                    </label>
                    <input 
                        type="number" 
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full"
                        value={sum.diamTub} 
                        onChange={e => onUpdate({ diamTub: e.target.value })} 
                        placeholder="0" 
                    />
                </div>
            </div>

            <div className="field-row grid grid-cols-2 gap-3 mb-3">
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">H LLEGADA (Z+Ø) <span className="text-gray-500 lowercase">m</span></label>
                    <input 
                        type="number" 
                        step="0.01" 
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full text-green-400 font-mono"
                        value={sum.hLlegada} 
                        onChange={e => {
                            const newZ = e.target.value;
                            const zF = parseFloat(newZ) || 0;
                            let dF = parseFloat(sum.diamTub) || 0;
                            if (sum.unitTub === 'in') dF = (dF * 25.4);
                            const calc = (zF + (dF / 1000)).toFixed(3);
                            onUpdate({ hLlegada: newZ, hSalida: calc });
                        }}
                        placeholder="0.00" 
                    />
                </div>
                <div className="field">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">H SALIDA <span className="text-gray-500 lowercase">m</span></label>
                    <input
                        type="text"
                        className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full text-green-400 font-mono"
                        value={sum.hSalida || ''}
                        onChange={e => onUpdate({ hSalida: e.target.value })}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="field">
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Material Tubería Salida</label>
                <select 
                    className="bg-gray-800 border border-gray-700 rounded p-2 text-sm w-full"
                    value={['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL'].includes(sum.matTub || '') ? sum.matTub : sum.matTub ? 'OTRO' : ''} 
                    onChange={e => onUpdate({ matTub: e.target.value === 'OTRO' ? 'OTRO' : e.target.value })}
                >
                    <option value="">— SELECCIONAR —</option>
                    <option value="CONCRETO">CONCRETO</option>
                    <option value="PVC CORRUGADO">PVC CORRUGADO</option>
                    <option value="PVC LISO">PVC LISO</option>
                    <option value="PLÁSTICO">PLÁSTICO</option>
                    <option value="ASBESTO CEMENTO">ASBESTO CEMENTO</option>
                    <option value="MAMPOSTERIA">MAMPOSTERIA</option>
                    <option value="GRES">GRES</option>
                    <option value="GRP">GRP</option>
                    <option value="METAL">METAL</option>
                    <option value="OTRO">OTRO</option>
                </select>
                {(!['CONCRETO', 'PVC CORRUGADO', 'PVC LISO', 'PLÁSTICO', 'ASBESTO CEMENTO', 'MAMPOSTERIA', 'GRES', 'GRP', 'METAL', ''].includes(sum.matTub || '') || sum.matTub === 'OTRO') && (
                    <input 
                        type="text" 
                        maxLength={60} 
                        value={sum.matTub === 'OTRO' ? '' : sum.matTub} 
                        onChange={e => onUpdate({ matTub: e.target.value.toUpperCase() })} 
                        className="mt-2 bg-gray-800 border border-blue-500/30 rounded p-2 text-xs w-full text-blue-400" 
                        placeholder="Especifique..." 
                    />
                )}
            </div>
        </div>
    );
};

export default SumideroCard;

