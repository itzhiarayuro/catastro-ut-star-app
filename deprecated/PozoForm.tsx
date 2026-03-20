import React from 'react';
import { Home, MapPin, Flag, Navigation, Info, Search } from 'lucide-react';
import { AppState, MUNICIPIOS, SISTEMAS, RASANTES, ESTADOS_POZO, TIPOS_CAMARA } from '../types/catastro';
import GeometriaPozo from './GeometriaPozo';
import ComponentesForm from './ComponentesForm';
import TuberiasForm from './TuberiasForm';

interface PozoFormProps {
    state: AppState;
    onUpdate: (u: Partial<AppState>) => void;
    numFocus?: (e: any) => void;
}

const PozoForm: React.FC<PozoFormProps> = ({ state, onUpdate, numFocus }) => {
    return (
        <div className="form-content">
            {/* Header / Info General */}
            <section className="form-section pb-4">
                <div className="section-header">
                    <div className="section-icon"><Home size={18} /></div>
                    <div className="section-title">INFORMACIÓN GENERAL</div>
                </div>

                <div className="field-row">
                    <div className="field">
                        <label>ID Pozo</label>
                        <input type="text" value={state.pozo} disabled className="bg-gray-800 opacity-50" />
                    </div>
                    <div className="field">
                        <label>Alias (Opcional)</label>
                        <input type="text" value={state.alias} onChange={e => onUpdate({ alias: e.target.value.toUpperCase() })} placeholder="Ej: P-001A" />
                    </div>
                </div>

                <div className="field-row">
                    <div className="field">
                        <label>Municipio</label>
                        <select value={state.municipio} onChange={e => onUpdate({ municipio: e.target.value })}>
                            {MUNICIPIOS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>Sistema</label>
                        <select value={state.sistema} onChange={e => onUpdate({ sistema: e.target.value })}>
                            {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="field">
                    <label>Barrio / Sector</label>
                    <input type="text" value={state.barrio} onChange={e => onUpdate({ barrio: e.target.value.toUpperCase() })} placeholder="Nombre del barrio..." />
                </div>

                <div className="field">
                    <label>Dirección Aproximada / Referencia</label>
                    <textarea value={state.direccion} onChange={e => onUpdate({ direccion: e.target.value.toUpperCase() })} placeholder="Cll 10 # 5-20..." rows={2} />
                </div>

                <div className="field-row">
                    <div className="field">
                        <label>Tipo Cámara</label>
                        <select value={state.tipoCamara} onChange={e => onUpdate({ tipoCamara: e.target.value })}>
                            {TIPOS_CAMARA.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            {/* Geometría */}
            <GeometriaPozo state={state} onUpdate={onUpdate} numFocus={numFocus} />

            {/* Componentes */}
            <ComponentesForm state={state} onUpdate={onUpdate} />

            {/* Tuberías y Sumideros */}
            <TuberiasForm state={state} onUpdate={onUpdate} numFocus={numFocus} />

            {/* Notas Finales */}
            <section className="form-section">
                <div className="section-header">
                    <div className="section-title">NOTAS Y OBSERVACIONES</div>
                </div>
                <textarea
                    className="w-full bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-white min-h-[120px]"
                    placeholder="Escriba aquí cualquier observación técnica adicional..."
                    value={state.notas}
                    onChange={e => onUpdate({ notas: e.target.value.toUpperCase() })}
                />
            </section>
        </div>
    );
};

export default PozoForm;
