import { AppState, INITIAL_STATE } from '../../types/catastro';

export const FichaService = {
    startNewFicha: (
        state: AppState,
        setState: (newState: Partial<AppState>) => void,
        setCurrentStep: (step: number) => void,
        setActiveScreen: (screen: any) => void
    ) => {
        // Preservar el municipio y el inspector actual para agilizar el flujo
        const currentMuni = state.municipio;
        const currentElaboro = state.elaboro;

        // If a draft already exists, ask the user before overwriting it.
        const existingDraft = localStorage.getItem('catastro_draft');
        if (existingDraft) {
            try {
                const draftObj = JSON.parse(existingDraft);
                // Only warn if the draft has some progress (id or pozo)
                if (draftObj.id || draftObj.pozo) {
                    const ok = window.confirm(
                        `Hay un borrador guardado (Pozo: ${draftObj.pozo || 'S/N'}). Crear una nueva ficha lo sobrescribirá. ¿Continuar?`
                    );
                    if (!ok) return;
                }
            } catch (e) {
                console.error("Error parsing existing draft:", e);
            }
        }
        
        const id = `F_${Date.now()}`;
        const newState = {
            ...INITIAL_STATE,
            id,
            createdAt: new Date().toISOString(),
            municipio: currentMuni,
            elaboro: currentElaboro,
            alias: ''
        };
        
        setState(newState);
        localStorage.setItem('catastro_draft', JSON.stringify(newState));
        setCurrentStep(1);
        setActiveScreen('sForm');
    }
};
