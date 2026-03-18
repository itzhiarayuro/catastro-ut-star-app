import { useState } from 'react';
import { AppState, INITIAL_STATE } from '../types/catastro';
import { useFirestoreDoc } from '../lib/firebase';
import { saveFichaToStorage } from '../utils/storageManager';
import { useAppStore } from './useAppStore';
import { safeLocalStorageSet, safeLocalStorageGet, safeLocalStorageGetRaw } from '../utils/ui';

/**
 * Guarda el borrador en localStorage de manera segura.
 */
const safeSetDraft = (key: string, data: any) => {
    try {
        const str = JSON.stringify(data);
        if (!safeLocalStorageSet(key, str)) {
            // If failed, try stripping photos
            const strippedStr = JSON.stringify(data, (k, v) => {
                if (k === 'binaryData' || k === 'binaryStrip' || k === 'blob') return undefined;
                return v;
            });
            safeLocalStorageSet(key, strippedStr);
            console.warn('[Storage] Borrador guardado sin fotos para evitar límite de cuota.');
        }
    } catch (e: any) {
        console.error('[Storage] Error al guardar borrador:', e);
    }
};

interface UseFichaActionsParams {
    toast: (msg: string) => void;
    safeSaveAllFichas: (fichas: Record<string, AppState>) => Promise<void>;
}

export const useFichaActions = ({ toast, safeSaveAllFichas }: UseFichaActionsParams) => {
    const store = useAppStore();
    const {
        setState, setActiveScreen, setCurrentStep,
        fichas, setFichas, isOnline,
        ...state
    } = store;

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const firestorePath = state.pozo && state.municipio
        ? `fichas/${state.municipio.toUpperCase()}_${state.pozo.replace(/\s+/g, '')}`
        : '';

    const { saveData, loading } = useFirestoreDoc(firestorePath);

    const updateState = (updates: Partial<AppState>) => {
        setState((prev: AppState) => {
            const next = { ...prev, ...updates };
            const screen = useAppStore.getState().activeScreen;
            if (screen === 'sForm') {
                safeSetDraft('catastro_draft', next);
            }
            return next;
        });
    };
    const startNewFicha = () => {
        const currentMuni = state.municipio;
        const currentElaboro = state.elaboro;

        const draftObj = safeLocalStorageGet('catastro_draft');
        if (draftObj) {
            if (draftObj.id || draftObj.pozo) {
                const ok = window.confirm(
                    `Hay un borrador guardado(Pozo: ${draftObj.pozo || 'S/N'}).Crear una nueva ficha lo sobrescribirá. ¿Continuar ? `
                );
                if (!ok) return;
            }
        }
        const id = `F_${Date.now()}`;
        const newState = {
            ...INITIAL_STATE,
            id,
            createdAt: new Date().toISOString(),
            municipio: currentMuni,
            elaboro: currentElaboro
        };
        setState(newState);
        safeSetDraft('catastro_draft', newState);
        setCurrentStep(1);
        setActiveScreen('sForm');
    };

    const continueDraft = () => {
        const parsed = safeLocalStorageGet('catastro_draft');
        if (parsed) {
            try {
                setState(parsed);
                setActiveScreen('sForm');
                const savedStep = safeLocalStorageGetRaw('catastro_current_step');
                setCurrentStep(savedStep ? parseInt(savedStep) : 1);
                setActiveScreen('sForm');
                toast("📝 Borrador restaurado");
            } catch (e) {
                toast("❌ Error al cargar borrador");
            }
        }
    };

    const handleEditFromMap = (fichaData: any) => {
        const safeData = { ...INITIAL_STATE, ...fichaData };
        if (safeData.deleted) {
            safeData.deleted = false;
        }
        safeSetDraft('catastro_draft', safeData);
        setState(safeData);
        setActiveScreen('sForm');
        setCurrentStep(1);
        toast("📝 Editando Ficha de Mapa...");
    };

    const saveFicha = async () => {
        const id = state.id || `F_${Date.now()}`;
        const now = new Date().toISOString();

        const normalizedPipes = state.pipes.map((p: any, idx: number) => ({
            ...p,
            es: (p.es || 'ENTRADA').toUpperCase() as any,
            orden: idx + 1
        }));

        const normalizedSums = state.sums.map((s: any, idx: number) => ({
            ...s,
            orden: idx + 1
        }));

        const finalData = { ...state, pipes: normalizedPipes, sums: normalizedSums, id, savedAt: now, synced: false } as AppState;

        // FIRST: Always save locally
        const updatedFichas = { ...fichas, [id]: finalData };
        setFichas(updatedFichas);

        await saveFichaToStorage(finalData);
        await safeSaveAllFichas(updatedFichas);

        // VALIDATION CHECK
        const missingFields: string[] = [];
        if (!state.pozo) missingFields.push("Pozo No.");
        if (!state.estadoPozo) missingFields.push("Estado Pozo");
        if (!state.sistema) missingFields.push("Sistema");
        if (!state.municipio) missingFields.push("Municipio");
        if (!state.barrio) missingFields.push("Barrio");
        if (!state.direccion) missingFields.push("Dirección");
        if (!state.elaboro) missingFields.push("Inspector");
        if (!state.rasante) missingFields.push("Rasante");
        if (!state.camara) missingFields.push("Tipo Cámara");

        state.pipes.forEach((p: any, i: number) => {
            if (!p.deA || !p.diam || p.diam === '0' || !p.mat || !p.estado || !p.emboq) {
                missingFields.push(`Tubería #${i + 1} (incompleta)`);
            }
        });
        state.sums.forEach((s: any, i: number) => {
            if (!s.tipo || !s.estado || !s.matRejilla || !s.matCaja || !s.diamTub || s.diamTub === '0' || !s.matTub) {
                missingFields.push(`Sumidero #${i + 1} (incompleto)`);
            }
        });

        if (missingFields.length > 0) {
            toast(`📝 Guardado Local & IDB. Pendiente: ${missingFields[0]}...`);
            setActiveScreen('sFichas');
            return;
        }

        // Save to Firestore if online
        if (isOnline) {
            try {
                await saveData(finalData);
                const completeSynced = { ...finalData, synced: true };
                const finalFichas = { ...updatedFichas, [id]: completeSynced };
                await safeSaveAllFichas(finalFichas);

                toast("✅ Sincronizado en Nube");
            } catch (e) {
                toast("⚠️ Error Nube, guardado local e IDB");
            }
        } else {
            toast("✅ Guardado en IDB y Local (Offline)");
        }
        setActiveScreen('sFichas');
    };

    const deleteFicha = (id: string) => {
        setDeleteId(id);
        setDeleteConfirmText('');
    };

    const confirmDelete = async () => {
        if (deleteConfirmText.toUpperCase() !== 'ELIMINAR') {
            toast("❌ Escribe ELIMINAR para confirmar");
            return;
        }

        const fichaToDelete = fichas[deleteId!];
        const updated = { ...fichas };

        updated[deleteId!] = {
            ...fichaToDelete,
            deleted: true,
            synced: false
        };

        await safeSaveAllFichas(updated);
        setDeleteId(null);
        toast("🗑️ Ficha movida a papelera (Soft Delete)");
    };

    const captureGPS = () => {
        if (!navigator.geolocation) return toast("❌ GPS no soportado");
        toast("📝 Capturando GPS...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                updateState({
                    gps: {
                        lat: parseFloat(pos.coords.latitude.toFixed(7)),
                        lng: parseFloat(pos.coords.longitude.toFixed(7)),
                        precision: parseFloat(pos.coords.accuracy.toFixed(1))
                    }
                });
                toast("✅ GPS Capturado (Alta Precisión)");
            },
            (err) => {
                const lat = (4.908 + (Math.random() - 0.5) * 0.001).toFixed(7);
                const lng = (-73.948 + (Math.random() - 0.5) * 0.001).toFixed(7);
                updateState({ gps: { lat: parseFloat(lat), lng: parseFloat(lng), precision: 5.4 } });
                toast("📝 GPS Simulado (Sopó)");
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    return {
        updateState,
        startNewFicha,
        continueDraft,
        handleEditFromMap,
        saveFicha,
        deleteFicha,
        confirmDelete,
        captureGPS,
        deleteId,
        setDeleteId,
        deleteConfirmText,
        setDeleteConfirmText,
        loading,
        safeSetDraft,
    };
};
