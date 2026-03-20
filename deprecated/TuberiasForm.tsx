import React from 'react';
import { Plus } from 'lucide-react';
import PipeCard from './forms/PipeCard';
import SumideroCard from './forms/SumideroCard';
import { AppState, Pipe, Sumidero } from '../types/catastro';

interface TuberiasFormProps {
    state: AppState;
    onUpdate: (u: Partial<AppState>) => void;
    numFocus?: (e: any) => void;
}

const TuberiasForm: React.FC<TuberiasFormProps> = ({ state, onUpdate, numFocus }) => {
    const addPipe = () => {
        const newPipe: Pipe = { 
            id: Date.now().toString(), 
            tipo: 'E', 
            es: 'ENTRADA',
            diam: '200', 
            unit: 'mm',
            mat: 'PVC LISO', 
            deA: '', 
            estado: 'LIMPIO', 
            emboq: 'SI', 
            cotaZ: '0.00' 
        };
        onUpdate({ pipes: [...state.pipes, newPipe] });
    };

    const updatePipe = (id: string, upd: Partial<Pipe>) => {
        onUpdate({ pipes: state.pipes.map(p => p.id === id ? { ...p, ...upd } : p) });
    };

    const deletePipe = (id: string) => {
        onUpdate({ pipes: state.pipes.filter(p => p.id !== id) });
    };

    const sumideros = state.sumideros || [];

    const addSumidero = () => {
        const newSum: Sumidero = { 
            id: Date.now().toString(), 
            codEsquema: 'S-' + (sumideros.length + 1), 
            tipo: 'COMBINADO O MIXTO', 
            matRejilla: 'METAL', 
            matCaja: 'CONCRETO', 
            hLlegada: '0.50', 
            hSalida: '0.80', 
            diamTub: '8', 
            matTub: 'PVC', 
            estado: 'bueno' 
        };
        onUpdate({ sumideros: [...sumideros, newSum] });
    };

    const updateSumidero = (id: string, upd: Partial<Sumidero>) => {
        onUpdate({ sumideros: sumideros.map(s => s.id === id ? { ...s, ...upd } : s) });
    };

    const deleteSumidero = (id: string) => {
        onUpdate({ sumideros: sumideros.filter(s => s.id !== id) });
    };

    return (
        <>
            <section className="form-section">
                <div className="section-header">
                    <div className="section-title">TUBERÍAS ({state.pipes.length})</div>
                    <button className="btn-add" onClick={addPipe}><Plus size={14} /> Tuberia</button>
                </div>
                <div className="pipes-grid">
                    {state.pipes.map((p, idx) => (
                        <PipeCard 
                            key={p.id} 
                            pipe={p} 
                            index={idx} 
                            onUpdate={(u) => updatePipe(p.id, u)}
                            onDelete={() => deletePipe(p.id)}
                            numFocus={numFocus || (() => {})}
                        />
                    ))}
                </div>
            </section>

            <section className="form-section">
                <div className="section-header">
                    <div className="section-title">SUMIDEROS CONECTADOS ({sumideros.length})</div>
                    <button className="btn-add" onClick={addSumidero}><Plus size={14} /> Sumidero</button>
                </div>
                <div className="sum-grid">
                    {sumideros.map((s, idx) => (
                        <SumideroCard 
                            key={s.id} 
                            sum={s} 
                            index={idx} 
                            onUpdate={(u) => updateSumidero(s.id, u)}
                            onDelete={() => deleteSumidero(s.id)}
                        />
                    ))}
                </div>
            </section>
        </>
    );
};

export default TuberiasForm;
