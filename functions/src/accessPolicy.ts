export const GLOBAL_FICHA_EDITORS = new Set([
    'juanvegas003@gmail.com',
    'juan.vega.icya@gmail.com',
    'kellyvj.icya@gmail.com',
]);

export const isGlobalFichaEditor = (email?: string | null) =>
    GLOBAL_FICHA_EDITORS.has(email?.trim().toLowerCase() || '');
