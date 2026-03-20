import React from 'react';
import { ComponentState } from '../../types/catastro';

interface ComponentEditorProps {
    label: string;
    data: ComponentState;
    onChange: (v: Partial<ComponentState>) => void;
    materials: string[];
    isCono?: boolean;
}

const ComponentEditor: React.FC<ComponentEditorProps> = ({ label, data, onChange, materials, isCono }) => (
    <div className="comp-section">
        <div className="comp-section-title">{label}</div>
        <div className="comp-row">
            <div className="flex justify-between items-center">
                <span className="comp-label">Existe</span>
                <div className="toggle3 w-32">
                    <button
                        className={`t-si ${data.existe === 'SI' ? 'active-si' : ''}`}
                        onClick={() => onChange({
                            existe: 'SI',
                            mat: (data.mat === '-' || !data.mat) ? (materials[0] || '') : data.mat,
                            ...(isCono && !data.tipo ? { tipo: 'CONCENTRICO' } : {})
                        })}
                    >
                        SI
                    </button>
                    <button className={`t-no ${data.existe === 'NO' ? 'active-no' : ''}`} onClick={() => onChange({ existe: 'NO', mat: '-', estado: '-' })}>NO</button>
                    <button className={`t-dk ${data.existe === 'DESCONOCIDO' ? 'active-dk' : ''}`} onClick={() => onChange({ existe: 'DESCONOCIDO', mat: '-', estado: '-' })}>DESC.</button>
                </div>
            </div>

            {data.existe === 'SI' ? (
                <>
                    {isCono && (
                        <div className="mb-4">
                            <label className="comp-label">Tipo</label>
                            <div className="chips">
                                {['CONCENTRICO', 'EXCENTRICO', 'OTRO'].map(t => (
                                    <div
                                        key={t}
                                        className={`chip ${(data.tipo === t && t !== 'OTRO') || (t === 'OTRO' && data.tipo && !['CONCENTRICO', 'EXCENTRICO'].includes(data.tipo)) || (data.tipo === 'OTRO' && t === 'OTRO') ? 'selected' : ''}`}
                                        onClick={() => onChange({ tipo: t })}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                            {((data.tipo && !['CONCENTRICO', 'EXCENTRICO'].includes(data.tipo)) || data.tipo === 'OTRO') && (
                                <input
                                    type="text"
                                    maxLength={60}
                                    value={data.tipo === 'OTRO' ? '' : data.tipo}
                                    onChange={e => onChange({ tipo: e.target.value.toUpperCase() })}
                                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '10px', marginTop: '8px', color: 'var(--text)', borderRadius: '8px', fontSize: '12px' }}
                                    placeholder="ESPECIFIQUE TIPO..."
                                />
                            )}
                        </div>
                    )}

                    <div>
                        <label className="comp-label">Material</label>
                        <div className="chips">
                            {materials.map(m => (
                                <div key={m} className={`chip ${(data.mat === m && m !== 'OTRO') || (m === 'OTRO' && data.mat && !materials.includes(data.mat as string)) || (data.mat === 'OTRO' && m === 'OTRO') ? 'selected' : ''}`} onClick={() => onChange({ mat: m })}>
                                    {m}
                                </div>
                            ))}
                        </div>
                        {((data.mat && !materials.includes(data.mat as string)) || data.mat === 'OTRO') && label !== 'Cargue' && (
                            <input
                                type="text"
                                maxLength={60}
                                value={data.mat === 'OTRO' ? '' : data.mat}
                                onChange={e => onChange({ mat: e.target.value.toUpperCase() })}
                                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '10px', marginTop: '8px', color: 'var(--text)', borderRadius: '8px', fontSize: '12px' }}
                                placeholder="ESPECIFIQUE MATERIAL..."
                            />
                        )}
                    </div>
                    <div>
                        <label className="comp-label">Estado</label>
                        <div className="semaphore">
                            {['bueno', 'regular', 'malo', 'desconocido'].map(e => (
                                <button
                                    key={e}
                                    className={`sem-btn s-${e === 'bueno' ? 'good' : e === 'regular' ? 'reg' : e === 'malo' ? 'bad' : 'unk'} ${data.estado === e ? 'active' : ''}`}
                                    onClick={() => onChange({ estado: e })}
                                >
                                    {e === 'desconocido' ? 'Desconocido' : e[0].toUpperCase() + e.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {label === 'Peldaños' && (
                        <div>
                            <label className="comp-label">Cantidad de Peldaños</label>
                            <input
                                type="number"
                                value={data.num || ''}
                                onChange={e => onChange({ num: parseInt(e.target.value) || 0 })}
                                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '10px', marginTop: '4px', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }}
                                placeholder="0"
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className="text-[10px] text-gray-500 italic mt-2 py-4 border-t border-dashed border-white/5 text-center bg-black/10 rounded-lg">
                    {data.existe === 'NO' ? 'Componente marcado como INEXISTENTE. Campos deshabilitados.' : 'Estado del componente DESCONOCIDO. Campos deshabilitados.'}
                </div>
            )}
        </div>
    </div>
);

export default ComponentEditor;
