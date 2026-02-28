import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

export const BingLayer: React.FC<{ active: boolean; defaultType: string }> = ({ active, defaultType }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const BING_ID = 'bing_satellite';

        if (!map.mapTypes.get(BING_ID)) {
            const bingMapType = new google.maps.ImageMapType({
                getTileUrl: function (coord, zoom) {
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

        if (active) {
            map.setMapTypeId(BING_ID);
        } else {
            map.setMapTypeId(defaultType);
        }
    }, [map, active, defaultType]);

    return null;
};
