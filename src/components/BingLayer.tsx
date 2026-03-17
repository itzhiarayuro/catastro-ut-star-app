import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { getTile } from '../lib/mapUtils';

export const CustomMapLayers: React.FC<{ mapType: 'hybrid' | 'roadmap' | 'bing' | 'osm' }> = ({ mapType }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const BING_ID = 'bing_satellite';
        const OSM_ID = 'osm_offline';

        // Register Bing
        if (!map.mapTypes.get(BING_ID)) {
            const bingMapType = new google.maps.ImageMapType({
                getTileUrl: (coord, zoom) => {
                    let quadKey = '';
                    for (let i = zoom; i > 0; i--) {
                        let digit = 0;
                        const mask = 1 << (i - 1);
                        if ((coord.x & mask) !== 0) digit += 1;
                        if ((coord.y & mask) !== 0) digit += 2;
                        quadKey += digit.toString();
                    }
                    return `https://ecn.t3.tiles.virtualearth.net/tiles/a${quadKey}.jpeg?g=1`;
                },
                tileSize: new google.maps.Size(256, 256),
                maxZoom: 19,
                minZoom: 1,
                name: 'Bing'
            });
            map.mapTypes.set(BING_ID, bingMapType);
        }

        // Register OSM (Offline capable)
        if (!map.mapTypes.get(OSM_ID)) {
            const osmMapType = new google.maps.ImageMapType({
                getTileUrl: (coord, zoom) => `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`,
                tileSize: new google.maps.Size(256, 256),
                maxZoom: 19,
                minZoom: 1,
                name: 'Offline'
            });

            // Override tile loading to check IndexedDB
            osmMapType.getTile = (coord, zoom, ownerDoc) => {
                const doc = ownerDoc || document;
                const img = doc.createElement('img');
                img.style.width = '256px';
                img.style.height = '256px';
                img.style.backgroundColor = '#0b0e14'; // Fondo oscuro mientras carga

                if (coord) {
                    const key = `osm_${zoom}_${coord.x}_${coord.y}`;
                    getTile(key).then(blob => {
                        if (blob) {
                            img.src = URL.createObjectURL(blob);
                            // Limpieza opcional: URL.revokeObjectURL(img.src) al desmontar o cargar otra
                        } else {
                            // Si no está en cache, intentar cargar online
                            img.src = `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`;
                        }
                    }).catch(() => {
                        img.src = `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`;
                    });
                }

                return img;
            };

            map.mapTypes.set(OSM_ID, osmMapType);
        }

        // Apply correct map type
        if (mapType === 'bing') {
            map.setMapTypeId(BING_ID);
        } else if (mapType === 'osm') {
            map.setMapTypeId(OSM_ID);
        } else {
            map.setMapTypeId(mapType);
        }

    }, [map, mapType]);

    return null;
};
