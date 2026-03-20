import React from 'react';
import { Ruler, ArrowUpDown, Info } from 'lucide-react';
import WellDiagram from '../presentation/components/WellDiagram';
import { AppState } from '../types/catastro';

interface GeometriaPozoProps {
    state: AppState;
    onUpdate: (u: Partial<AppState>) => void;
    numFocus?: (e: any) => void;
}

const GeometriaPozo: React.FC<GeometriaPozoProps> = ({ state, onUpdate, numFocus }) => {
    return (
        <section className="form-section">
            <div className="section-header">
                <div className="section-icon"><Ruler size={18} /></div>
                <div className="section-title">GEOMETRÍA DEL POZO</div>
            </div>

            <div className="geom-container">
                <div className="geom-inputs">
                    <div className="field">
                        <label className="flex items-center gap-1"><ArrowUpDown size={12} className="rotate-90" /> Diámetro (m)</label>
                        <div className="input-with-btns">
                            <button onClick={() => onUpdate({ diametro: Number(Math.max(0, (state.diametro || 0) - 0.1).toFixed(2)) })}>-</button>
                            <input type="number" step="0.1" value={state.diametro || 0}
                                onFocus={numFocus}
                                onChange={e => onUpdate({ diametro: parseFloat(e.target.value) || 0 })} />
                            <button onClick={() => onUpdate({ diametro: Number(((state.diametro || 0) + 0.1).toFixed(2)) })}>+</button>
                        </div>
                    </div>

                    <div className="field">
                        <label className="flex items-center gap-1"><ArrowUpDown size={12} /> Profundidad (m)</label>
                        <div className="input-with-btns">
                            <button onClick={() => onUpdate({ altura: Number(Math.max(0, (state.altura || 0) - 0.2).toFixed(2)) })}>-</button>
                            <input type="number" step="0.1" value={state.altura || 0}
                                onFocus={numFocus}
                                onChange={e => onUpdate({ altura: parseFloat(e.target.value) || 0 })} />
                            <button onClick={() => onUpdate({ altura: Number(((state.altura || 0) + 0.2).toFixed(2)) })}>+</button>
                        </div>
                    </div>

                    <div className="field">
                        <label>Estado Pozo</label>
                        <select value={state.estadoPozo} onChange={e => onUpdate({ estadoPozo: e.target.value })}>
                            <option value="EXCELENTE">EXCELENTE</option>
                            <option value="BUENO">BUENO</option>
                            <option value="REGULAR">REGULAR</option>
                            <option value="MALO">MALO</option>
                            <option value="COLMATADO">COLMATADO</option>
                            <option value="TAPADO">TAPADO</option>
                        </select>
                    </div>

                    <div className="geom-info">
                        <Info size={14} className="text-blue-400" />
                        <span>Cotas calculadas automáticamente según referencia GPS y geometría.</span>
                    </div>
                </div>

                <div className="geom-viz">
                    <WellDiagram
                        diam={state.diametro || 1.2}
                        altura={state.altura || 2.4}
                        pipes={state.pipes}
                    />
                </div>
            </div>
        </section>
    );
};

export default GeometriaPozo;
