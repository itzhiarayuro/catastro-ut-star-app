import React from 'react';

const PIPE_STATES = ['LIMPIO', 'INUNDADO', 'SEDIMENTADO', 'COLMATADO', 'CON BASURAS'];

interface PipeStateFieldProps {
    value: string;
    onChange: (value: string) => void;
}

export function PipeStateField({ value, onChange }: PipeStateFieldProps) {
    const isCustom = value === 'OTRO' || (!!value && !PIPE_STATES.includes(value));
    const selectedValue = isCustom ? 'OTRO' : value;
    const customValue = value === 'OTRO' ? '' : value;

    return (
        <div className="field">
            <label>Estado Tub.</label>
            <select value={selectedValue} onChange={event => onChange(event.target.value)}>
                <option value="">—</option>
                {PIPE_STATES.map(state => <option key={state}>{state}</option>)}
                <option>OTRO</option>
            </select>
            {isCustom && (
                <input
                    type="text"
                    maxLength={60}
                    value={customValue}
                    onChange={event => onChange(event.target.value.toUpperCase())}
                    placeholder="Especifique Estado..."
                    className="font-mono"
                    style={{ marginTop: 8 }}
                />
            )}
        </div>
    );
}
