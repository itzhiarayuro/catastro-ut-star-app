import React from 'react';
import { ChevronLeft, Check, List } from 'lucide-react';
import { Pipe, Sumidero, AppState } from '../../types/catastro';
import { FotoRegistro } from '../../utils/fotoProcessor';
import FotosZone from '../../components/FotosZone';
import ManholeDiagram from '../../components/ManholeDiagram';

interface Props {
    pipes: Pipe[];
    sums: Sumidero[];
    pozo: string;
    municipio: string;
    fotoList: FotoRegistro[];
    obs: string;
    altura: string | number;
    estadoPozo: string;
    updateState: (updates: Partial<AppState>) => void;
    setCurrentStep: (step: number) => void;
    toast: (msg: string) => void;
}

export const FotosSection: React.FC<Props> = ({
    pipes, sums, pozo, municipio, fotoList, obs, altura, estadoPozo,
    updateState, setCurrentStep, toast,
}) => (
    <div className="animate-in slide-in-from-right duration-300">
        <div className="card mb-2" style={{ padding: '8px', background: 'var(--bg2)' }}>
            <div className="flex justify-between items-center mb-1">
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Esquema de Referencia</span>
                <span style={{ fontSize: '8px', color: 'var(--blue)' }}>{pipes.length} Ramales</span>
            </div>
            <div style={{ height: '140px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ transform: 'scale(0.55)', transformOrigin: 'center' }}>
                    <ManholeDiagram pozoId={pozo} pipes={pipes} isReadOnly />
                </div>
            </div>
        </div>

        <div className="p-2">
            <FotosZone
                pozoId={pozo || 'P000'}
                photos={fotoList}
                pipes={pipes}
                sums={sums}
                onAddPhoto={(foto: FotoRegistro) => updateState({ fotoList: [...fotoList, foto] })}
                onDeletePhoto={(id: string) => updateState({ fotoList: fotoList.filter(f => f.id !== id) })}
                readOnlyComponents={true}
                estadoPozo={estadoPozo}
                municipio={municipio}
            />
        </div>

        <div className="card">
            <div className="card-title">Observaciones y Cierre</div>
            <div className="field">
                <div className="flex justify-between items-end mb-1">
                    <label className="mb-0">Observaciones</label>
                    <button
                        className="bg-white/5 hover:bg-white/10 text-[10px] py-1 px-2 rounded-md flex items-center gap-1 transition-all"
                        onClick={() => updateState({ obs: obs + (obs.endsWith('\n') || obs === '' ? '' : '\n') + '• ' })}
                    >
                        <List size={12} /> Añadir Viñeta
                    </button>
                </div>
                <textarea
                    value={obs}
                    onChange={e => updateState({ obs: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const lines = obs.split('\n');
                            if (lines[lines.length - 1].trim().startsWith('•')) {
                                e.preventDefault();
                                updateState({ obs: obs + '\n• ' });
                            }
                        }
                    }}
                    rows={6}
                    placeholder="Ej: • Tapa fisurada..."
                />
            </div>
        </div>

        <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setCurrentStep(4)}><ChevronLeft size={16} /> Volver</button>
            <button className="btn btn-green" onClick={() => {
                const totalH = Number(altura);
                if (!isNaN(totalH) && pipes.length > 0) {
                    const warnings: string[] = [];
                    for (const p of pipes) {
                        const z = parseFloat(p.cotaZ) || 0;
                        let d = parseFloat(p.diam) || 0;
                        if (p.unit === 'in') d = d * 25.4;
                        const bateaVal = z + d / 1000;
                        if (totalH < bateaVal) warnings.push(`⚠️ ${p.es}: Altura (${totalH}m) < Batea (${bateaVal.toFixed(3)}m)`);
                    }
                    if (warnings.length > 0) toast(warnings.join(' | '));
                }
                setCurrentStep(6);
            }}>Finalizar <Check size={16} /></button>
        </div>
    </div>
);
