import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, INITIAL_STATE } from '../types/catastro';

export type ScreenName = 'sPortal' | 'sActivity' | 's0' | 'sFichas' | 'sConfig' | 'sForm' | 'sMaps' | 'sMarcacion' | 'sFichasViewer';

interface AppStore extends AppState {
  // UI State
  activeScreen: ScreenName;
  currentStep: number;
  fichas: Record<string, AppState>;
  isOnline: boolean;
  pendingCount: number;
  pendingMarcaciones: number;

  // Actions
  setState: (newState: Partial<AppState> | ((state: AppStore) => Partial<AppState>)) => void;
  setActiveScreen: (screen: AppStore['activeScreen']) => void;
  setCurrentStep: (step: number) => void;
  setFichas: (fichas: Record<string, AppState>) => void;
  setIsOnline: (isOnline: boolean) => void;
  setPendingCount: (count: number) => void;
  setPendingMarcaciones: (count: number) => void;
  resetForm: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      activeScreen: 'sPortal',
      currentStep: 1,
      fichas: {},
      isOnline: navigator.onLine,
      pendingCount: 0,
      pendingMarcaciones: 0,

      setState: (newState: any) => set((state: AppStore) => {
        const updates = typeof newState === 'function' ? newState(state) : newState;
        return { ...state, ...updates };
      }),
      setActiveScreen: (screen: AppStore['activeScreen']) => set({ activeScreen: screen }),
      setCurrentStep: (step: number) => set({ currentStep: step }),
      setFichas: (fichas: Record<string, AppState>) => set({ fichas }),
      setIsOnline: (isOnline: boolean) => set({ isOnline }),
      setPendingCount: (count: number) => set({ pendingCount: count }),
      setPendingMarcaciones: (count: number) => set({ pendingMarcaciones: count }),
      resetForm: () => set({ ...INITIAL_STATE, currentStep: 1 }),
    }),
    {
      name: 'catastro-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state: AppStore) => ({
        // Solo persistimos lo necesario para no saturar LS
        ...state,
        fotoList: [], // Las fotos van a IndexedDB, no saturar LS
        photos: { general: [], interior: [], danos: [], esquemaVertical: [], ubGeneral: [] },
      }),
    }
  )
);
