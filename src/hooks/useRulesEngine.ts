import { useEffect } from 'react';
import { AppState } from '../types/catastro';

export const useRulesEngine = (state: AppState, setState: (state: AppState | ((prev: AppState) => AppState)) => void) => {
    useEffect(() => {
        let newState = { ...state };
        let changed = false;

        // 1. Prioridad: OCULTO -> TODO bloqueado Desconocido
        if (state.sistema === 'OCULTO') {
            if (state.camara !== 'DESCONOCIDO') { newState.camara = 'DESCONOCIDO'; changed = true; }
            const fields: (keyof AppState)[] = ['tapa', 'cargue', 'cuerpo', 'cono', 'canu', 'peld'];
            fields.forEach(f => {
                const fieldVal = state[f];
                if (fieldVal && typeof fieldVal === 'object' && 'existe' in fieldVal) {
                    if ((fieldVal as any).existe !== 'DESCONOCIDO') {
                        (newState[f] as any) = { ...(fieldVal as any), existe: 'DESCONOCIDO', estado: 'desconocido' };
                        changed = true;
                    }
                }
            });
        }

        // 2. SELLADO -> Sistema/Tipo Cam bloqueado
        if (state.estadoPozo === 'Sellado') {
            if (state.sistema !== 'DESCONOCIDO') { newState.sistema = 'DESCONOCIDO'; changed = true; }
            if (state.camara !== 'DESCONOCIDO') { newState.camara = 'DESCONOCIDO'; changed = true; }
        }

        // 3. COLMATADO -> Cañuela bloqueada
        if (state.estadoPozo === 'Colmatado') {
            if (state.canu.existe !== 'DESCONOCIDO') { newState.canu = { ...state.canu, existe: 'DESCONOCIDO' }; changed = true; }
        }

        // 4. INUNDADO -> Tapa NO Desconocido
        if (state.estadoPozo === 'Inundado') {
            if (state.tapa.existe === 'DESCONOCIDO') { newState.tapa.existe = 'SI'; changed = true; }
        }

        // 5. SIN REPRES -> NO Desconocido campos (sugerencia de integridad)
        if (state.estadoPozo === 'Sin represamiento') {
            // Logic to encourage known values (usually handled by UI hints)
        }

        // 6. SISTEMA DESCONOCIDO -> Tipo Cam/Cañuela bloqueado
        if (state.sistema === 'DESCONOCIDO' && state.estadoPozo !== 'Inundado') {
            if (state.camara !== 'DESCONOCIDO') { newState.camara = 'DESCONOCIDO'; changed = true; }
            if (state.canu.existe !== 'DESCONOCIDO') { newState.canu.existe = 'DESCONOCIDO'; changed = true; }
        }

        // 7. RASANTE DESCONOCIDO -> Relacionados bloqueado
        if (state.rasante === 'DESCONOCIDO') {
            if (state.tapa.existe !== 'DESCONOCIDO') { newState.tapa.existe = 'DESCONOCIDO'; changed = true; }
        }

        // 8. TIPO CAM DESCONOCIDO -> Solo habilitado exterior
        if (state.camara === 'DESCONOCIDO') {
            if (state.canu.existe !== 'DESCONOCIDO') { newState.canu.existe = 'DESCONOCIDO'; changed = true; }
        }

        if (changed) {
            setState(newState);
        }
    }, [state.sistema, state.estadoPozo, state.rasante, state.camara]);
};
