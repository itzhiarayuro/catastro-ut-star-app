/**
 * Definición formal de tipos para el sistema de Catastro UT Star
 * Implementa la base para POO y tipado fuerte
 */

export interface Coordenadas {
    lat: number;
    lng: number;
    x?: number;
    y?: number;
}

export interface ComponenteBasico {
    existe: 'SÍ' | 'NO' | '-';
    material: string;
    estado: string;
}

export interface Cono extends ComponenteBasico {
    tipo: string;
}

export interface Peldanos extends ComponenteBasico {
    numero: string;
}

export interface Tuberia {
    id: string;
    tipo: 'entrada' | 'salida' | 'especial';
    deA: string;
    diametro: string | number;
    material: string;
    cotaZ: number;
    batea: number;
    emboquillado: string;
    orden: number;
    estado: string;
}

export interface Sumidero {
    id: string;
    tipo: string;
    esquema: string;
    codEsquema: string;
    diametro: string | number;
    material: string;
    hSalida: number;
    hLlegada: number;
    estado: string;
}

export interface Foto {
    id: string;
    filename: string;
    blobId: string;
    subcategoria: string;
    timestamp: number;
}

export interface Pozo {
    id: string;
    alias?: string;
    municipio: string;
    barrio: string;
    direccion: string;
    fecha: string;
    inspector: string;
    estadoRegistro: string;
    gps: Coordenadas;
    altura: number;
    sistema: string;
    tipoCamara: string;
    componentes: {
        tapa: ComponenteBasico;
        cono: Cono;
        cilindro: ComponenteBasico;
        canuela: ComponenteBasico;
        peldanos: Peldanos;
        rasante: string;
    };
    tuberias: Tuberia[];
    sumideros: Sumidero[];
    fotos: Foto[];
    observaciones: string;
}
