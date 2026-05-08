import React from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Plus } from 'lucide-react';
import { Pipe, Sumidero, AppState } from '../../types/catastro';
import { FotoRegistro } from '../../utils/fotoProcessor';
import ManholeDiagram from '../../components/ManholeDiagram';
import PipeCard from '../../components/forms/PipeCard';
import SumideroCard from '../../components/forms/SumideroCard';
import { numFocus } from '../../utils/ui';

interface Props {
    pipes: Pipe[];
    sums: Sumidero[];
    pozo: string;
    municipio: string;
    fotoList: FotoRegistro[];
    pendiente: string | number;
    altura: string | number;
    isLocked: boolean;
    updateState: (updates: Partial<AppState>) => void;
    setCurrentStep: (step: number) => void;
    setPreviewPhoto: (photo: FotoRegistro | null) => void;
}

const getPipePhoto = (p: Pipe, pipes: Pipe[], photos: FotoRegistro[]) => {
    const orient = (p || {}).es?.toUpperCase() || '';
    const isSalida = orient === 'SALIDA' || orient === 'S';
    const isEntrada = orient === 'ENTRADA' || orient === 'E' || orient === '';
    const isSum = orient === 'SUMIDERO' || orient === 'SUM';

    let group: Pipe[] = [];
    let prefix = '';
    if (isSalida) {
        group = pipes.filter(x => { const o = (x.es || '').toUpperCase(); return o === 'SALIDA' || o === 'S'; });
        prefix = 'S';
    } else if (isEntrada) {
        group = pipes.filter(x => { const o = (x.es || '').toUpperCase(); return o === 'ENTRADA' || o === 'E' || o === ''; });
        prefix = 'E';
    } else if (isSum) {
        group = pipes.filter(x => { const o = (x.es || '').toUpperCase(); return o === 'SUMIDERO' || o === 'SUM'; });
        prefix = 'SUM';
    }

    const idx = group.findIndex(x => x.id === p.id);
    if (idx === -1) return null;
    const label = `${prefix}${idx + 1}`;
    return (photos || []).find(f => f.subcategoria === label) ||
           (photos || []).find(f => (f.subcategoria || '').startsWith(`${label}-`));
};

const getSumPhoto = (s: Sumidero, sums: Sumidero[], pipes: Pipe[], photos: FotoRegistro[]) => {
    const idxInSums = (sums || []).findIndex(x => x.id === s.id);
    if (idxInSums === -1) return null;
    const label = `SUM${idxInSums + 1}`;
    return (photos || []).find(f => f.subcategoria === label) ||
           (photos || []).find(f => (f.subcategoria || '').startsWith(`${label}-`));
};

const getNormalizedType = (pObj: any) => {
    const raw = pObj?.es || pObj?.tipo || 'ENTRADA';
    const up = raw.toUpperCase();
    if (up === 'E' || up === 'ENTRADA') return 'ENTRADA';
    if (up === 'S' || up === 'SALIDA') return 'SALIDA';
    if (up === 'SUM' || up === 'SUMIDERO') return 'SUMIDERO';
    return 'ENTRADA';
};

export const TuberiasSection: React.FC<Props> = ({
    pipes, sums, pozo, municipio, fotoList, pendiente, altura,
    isLocked, updateState, setCurrentStep, setPreviewPhoto,
}) => {
    const hTotal = Number(altura) || 0;

    const alerts: string[] = [];
    pipes.forEach((p) => {
        const orient = (p.es || '').toUpperCase();
        const sameType = pipes.filter(x => (x.es || '').toUpperCase() === orient);
        const tIdx = sameType.findIndex(x => x.id === p.id);
        const tLabel = `${orient === 'SALIDA' ? 'S' : orient === 'SUMIDERO' ? 'SUM' : 'E'}${tIdx + 1}`;
        const z = parseFloat(p.cotaZ) || 0;
        let d = parseFloat(p.diam) || 0;
        if (p.unit === 'in') d = d * 25.4;
        const batea = z + d / 1000;
        if ((p.es === 'ENTRADA' || p.es === 'SALIDA') && hTotal < batea)
            alerts.push(`Tubería ${tLabel} (${p.es}): Altura total (${hTotal}m) debe ser ≥ Batea (${batea.toFixed(3)}m)`);
    });

    return (
        <div className="animate-in slide-in-from-right duration-300">
            <div className="card">
                <div className="card-title">Esquema de Tuberías (E1-7 / S1-2)</div>
                <div className="p-2">
                    <ManholeDiagram
                        pozoId={pozo || 'S/N'}
                        pipes={pipes}
                        onPipesChange={(newPipes) => updateState({ pipes: newPipes })}
                    />
                </div>
            </div>

            <div className="card mt-4">
                <div className="card-title">Datos Generales</div>
                <div className="field">
                    <label>Pendiente (%) General</label>
                    <input
                        type="number" step="0.1" value={pendiente}
                        onChange={e => updateState({ pendiente: e.target.value })}
                        placeholder="0.0"
                        className="bg-gray-800 text-yellow-400 font-mono text-center"
                    />
                </div>
            </div>

            {alerts.length > 0 && (
                <div className="card mt-4 border-red-500/50 bg-red-500/10 animate-pulse">
                    <div className="card-title text-red-500 flex items-center gap-2"><AlertTriangle size={16} /> Alertas de Alturas</div>
                    <div className="p-2 space-y-1">
                        {alerts.map((a, i) => <div key={i} className="text-[11px] text-red-400 font-bold">• {a}</div>)}
                    </div>
                </div>
            )}

            <div className="card mt-4">
                <div className="card-title">Resumen de Ramales</div>
                <div className="space-y-3">
                    {pipes.length === 0 ? (
                        <div className="text-center py-6 opacity-40 italic text-xs">No hay ramales configurados. Toca el diagrama arriba para agregar.</div>
                    ) : (
                        pipes.map((p, idx) => {
                            const foto = getPipePhoto(p, pipes, fotoList);
                            return (
                                <PipeCard
                                    key={p.id}
                                    pipe={p}
                                    allPipes={pipes}
                                    index={idx}
                                    foto={foto}
                                    pozoId={pozo}
                                    municipio={municipio}
                                    photos={fotoList}
                                    onAddPhoto={(foto: FotoRegistro) => updateState({ fotoList: [...fotoList, foto] })}
                                    onDeletePhoto={(id: string) => updateState({ fotoList: fotoList.filter(f => f.id !== id) })}
                                    onPreviewPhoto={setPreviewPhoto}
                                    isLocked={isLocked}
                                    onUpdate={(upd) => {
                                        const newPipes = [...pipes];
                                        const updatedPipe = { ...p, ...upd };
                                        newPipes[idx] = updatedPipe;
                                        const updates: any = { pipes: newPipes };

                                        const currentType = getNormalizedType(updatedPipe);
                                        if (currentType === 'SUMIDERO' && (upd.cotaZ !== undefined || upd.diam !== undefined || upd.unit !== undefined || upd.es !== undefined || upd.tipo !== undefined)) {
                                            const z = parseFloat(updatedPipe.cotaZ) || 0;
                                            let d = parseFloat(updatedPipe.diam) || 0;
                                            if (updatedPipe.unit === 'in') d = d * 25.4;
                                            const computedBatea = (z + d / 1000).toFixed(3);

                                            const sameTypePipes = newPipes.filter(x => getNormalizedType(x) === 'SUMIDERO');
                                            const typeIndexInGroup = sameTypePipes.findIndex(x => x.id === updatedPipe.id);

                                            if (typeIndexInGroup >= 0 && typeIndexInGroup < sums.length) {
                                                const newSums = [...sums];
                                                const sumTarget = newSums[typeIndexInGroup];
                                                const sumZ = parseFloat(computedBatea) || 0;
                                                let sumD = parseFloat(sumTarget.diamTub) || 0;
                                                if (sumTarget.unitTub === 'in') sumD = sumD * 25.4;
                                                newSums[typeIndexInGroup] = {
                                                    ...sumTarget,
                                                    hLlegada: computedBatea,
                                                    hSalida: (sumZ + sumD / 1000).toFixed(3),
                                                };
                                                updates.sums = newSums;
                                            }
                                        }

                                        updateState(updates);
                                    }}
                                    onDelete={() => updateState({ pipes: pipes.filter((_, i) => i !== idx) })}
                                    numFocus={numFocus}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            <div className="card mt-4">
                <div className="card-title">Sumideros (1-6)</div>
                <div className="space-y-4">
                    {sums.map((s, idx) => {
                        const foto = getSumPhoto(s, sums, pipes, fotoList);
                        return (
                            <SumideroCard
                                key={s.id}
                                sum={s}
                                index={idx}
                                foto={foto}
                                pozoId={pozo}
                                municipio={municipio}
                                photos={fotoList}
                                onAddPhoto={(foto: FotoRegistro) => updateState({ fotoList: [...fotoList, foto] })}
                                onDeletePhoto={(id: string) => updateState({ fotoList: fotoList.filter(f => f.id !== id) })}
                                onPreviewPhoto={setPreviewPhoto}
                                isLocked={isLocked}
                                onUpdate={(upd) => {
                                    const newSums = [...sums];
                                    newSums[idx] = { ...s, ...upd };
                                    updateState({ sums: newSums });
                                }}
                                onDelete={() => updateState({ sums: sums.filter((_, i) => i !== idx) })}
                            />
                        );
                    })}
                    <button className="btn btn-orange btn-full btn-sm" onClick={() => {
                        const id = `S_${Date.now()}`;
                        updateState({ sums: [...sums, { id, tipo: '', matRejilla: '', matCaja: '', hSalida: '', hLlegada: '', estado: '', codEsquema: `S-${sums.length + 1}`, diamTub: '', matTub: '' }] });
                    }}>
                        <Plus size={14} /> Agregar Sumidero
                    </button>
                </div>
            </div>

            <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setCurrentStep(3)}><ChevronLeft size={16} /> Volver</button>
                <button className="btn btn-green" onClick={() => setCurrentStep(5)}>Siguiente <ChevronRight size={16} /></button>
            </div>
        </div>
    );
};
