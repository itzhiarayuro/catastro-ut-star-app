export const GLOBAL_FICHA_EDITORS = [
    'juanvegas003@gmail.com',
    'juan.vega.icya@gmail.com',
    'kellyvj.icya@gmail.com',
] as const;

export const DRIVE_MAINTAINERS = ['juanvegas003@gmail.com'] as const;

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';

export function getFichaPermissions(email?: string | null) {
    const normalized = normalizeEmail(email);
    const viewAll = GLOBAL_FICHA_EDITORS.includes(normalized as typeof GLOBAL_FICHA_EDITORS[number]);
    const isKelly = normalized === 'kellyvj.icya@gmail.com';
    return {
        viewAll,
        editAll: viewAll,
        deleteAll: false,
        deleteOwn: !isKelly,
        driveMaintenance: DRIVE_MAINTAINERS.includes(normalized as typeof DRIVE_MAINTAINERS[number]),
    };
}

export const isGlobalFichaEditor = (email?: string | null) => getFichaPermissions(email).editAll;
export const canUseDriveMaintenance = (email?: string | null) => getFichaPermissions(email).driveMaintenance;
