import proj4 from 'proj4';

/**
 * Definición de EPSG:9377 (MAGNA-SIRGAS / Origen Nacional)
 * Es el sistema de referencia oficial de Colombia desde 2020.
 */
const EPSG9377 = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

/**
 * Convierte coordenadas WGS84 (Latitud/Longitud) al sistema nacional colombiano EPSG:9377.
 * 
 * @param lat Latitud en grados decimales (WGS84)
 * @param lon Longitud en grados decimales (WGS84)
 * @returns { coordenada_x: number, coordenada_y: number } Coordenadas en metros (CTM12)
 */
export const convertirA9377 = (lat: number, lon: number) => {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return { coordenada_x: 0, coordenada_y: 0 };
    }
    
    try {
        // proj4 espera [longitud, latitud] para proyecciones geográficas
        const [x, y] = proj4('EPSG:4326', EPSG9377, [lon, lat]);
        
        return {
            coordenada_x: Math.round(x * 1000) / 1000, // Precisión de 3 decimales (milímetros)
            coordenada_y: Math.round(y * 1000) / 1000
        };
    } catch (error) {
        console.error("Error en conversión de coordenadas:", error);
        return { coordenada_x: 0, coordenada_y: 0 };
    }
};
