/**
 * UI Utility Helpers
 */

/**
 * Selecciona todo el contenido de un input al recibir foco.
 * Útil para campos numéricos.
 */
export const numFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
};

/**
 * Genera un ID único corto.
 */
export const generateId = () => {
    return Math.random().toString(36).substring(2, 11);
};

/**
 * Utility to safe-set items in localStorage handling QuotaExceededError.
 * Returns true if successful, false otherwise.
 */
export const safeLocalStorageSet = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.message?.includes('exceeded the quota')) {
            console.warn(`⚠️ QuotaExceeded on localStorage for key "${key}". Use clear database to free space.`);
            return false;
        }
        console.error(`❌ Error writing to localStorage key "${key}":`, e);
        return false;
    }
};

/**
 * Utility to safely JSON parse items from localStorage.
 */
export const safeLocalStorageGet = (key: string, fallback: any = null): any => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`❌ Error reading/parsing localStorage key "${key}":`, e);
        return fallback;
    }
};

/**
 * Utility to safely get raw string from localStorage.
 */
export const safeLocalStorageGetRaw = (key: string, fallback: string = ''): string => {
    try {
        return localStorage.getItem(key) || fallback;
    } catch (e) {
        console.error(`❌ Error reading localStorage key "${key}":`, e);
        return fallback;
    }
};

/**
 * Utility to safely remove items from localStorage.
 */
export const safeLocalStorageRemove = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error(`❌ Error removing localStorage key "${key}":`, e);
    }
};

// ─── Municipio Cache (per-day) ────────────────────────────────────────────────
const MUNICIPIO_CACHE_KEY = 'catastro_municipio_cache';

/**
 * Persiste el municipio seleccionado junto con la fecha de hoy.
 * Se usa desde la pantalla de configuración Y desde el Paso 1 del formulario.
 */
export const saveMunicipioCache = (municipio: string): void => {
    const today = new Date().toISOString().split('T')[0];
    safeLocalStorageSet(MUNICIPIO_CACHE_KEY, JSON.stringify({ municipio, date: today }));
};

/**
 * Recupera el municipio del caché si fue guardado hoy.
 * Retorna null si el caché es de otro día o no existe.
 */
export const getMunicipioCached = (): string | null => {
    const cached = safeLocalStorageGet(MUNICIPIO_CACHE_KEY, null);
    if (!cached || typeof cached !== 'object') return null;
    const today = new Date().toISOString().split('T')[0];
    return cached.date === today ? cached.municipio : null;
};
