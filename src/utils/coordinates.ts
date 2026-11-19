export type DecimalCoordinates = { lat: number; lng: number };

const DMS_PATTERN = /^\s*(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:[.,]\d+)?)\s*["″]\s*([NS])\s*[,;]?\s*(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:[.,]\d+)?)\s*["″]\s*([EW])\s*$/i;

function toDecimal(degrees: number, minutes: number, seconds: number, hemisphere: string): number {
    if (minutes >= 60 || seconds >= 60) throw new Error('Formato de coordenadas inválido');
    const value = degrees + minutes / 60 + seconds / 3600;
    return ['S', 'W'].includes(hemisphere.toUpperCase()) ? -value : value;
}

export function parseCoordinates(value: string): DecimalCoordinates {
    const match = value.match(DMS_PATTERN);
    if (!match) throw new Error('Formato de coordenadas inválido');

    const lat = toDecimal(Number(match[1]), Number(match[2]), Number(match[3].replace(',', '.')), match[4]);
    const lng = toDecimal(Number(match[5]), Number(match[6]), Number(match[7].replace(',', '.')), match[8]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Coordenadas fuera de rango');
    return { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) };
}
