import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

export const BingLayer: React.FC<{ active: boolean; defaultType: string }> = ({ active, defaultType }) => {
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
                getTileUrl: (coord, zoom) => {
                    // This is a dummy URL because we will override the tile rendering logic
                    // logic is handled via custom store
                    return `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`;
                },
                tileSize: new google.maps.Size(256, 256),
                maxZoom: 19,
                minZoom: 1,
                name: 'Offline'
            });

            // Override tile loading to check IndexedDB
            osmMapType.getTile = (coord, zoom, ownerDocument) => {
                const img = ownerDocument.createElement('img');
                img.style.width = '256px';
                img.style.height = '256px';

                const key = `osm_${zoom}_${coord.x}_${coord.y}`;
                import('./OfflineMapManager').then(m => m.getTile(key)).then(blob => {
                    if (blob) {
                        img.src = URL.createObjectURL(blob);
                    } else {
                        img.src = `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`;
                    }
                }).catch(() => {
                    img.src = `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`;
                });

                return img;
            };

            map.mapTypes.set(OSM_ID, osmMapType);
        }

        if (active) {
            map.setMapTypeId(OSM_ID);
        } else if (defaultType === 'bing') {
            map.setMapTypeId(BING_ID);
        } else {
            map.setMapTypeId(defaultType);
        }
    }, [map, active, defaultType]);

    return null;
};
