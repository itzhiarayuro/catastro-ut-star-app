const proj4 = require('proj4');

const EPSG9377 = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
proj4.defs('EPSG:9377', EPSG9377);

function convertirA9377(lat, lon) {
    try {
        const [x, y] = proj4('EPSG:4326', 'EPSG:9377', [lon, lat]);
        return {
            x: Math.round(x * 1000) / 1000,
            y: Math.round(y * 1000) / 1000,
        };
    } catch (e) {
        return null;
    }
}

const coords = [
    [4.52952275, -74.23564116],
    [4.529656553, -74.23557046],
    [4.528353724, -74.23705975],
    [4.529708984, -74.23553084],
    [4.528280152, -74.23528557],
    [4.528482114, -74.23669322],
    [4.529483095, -74.23526347],
    [4.529099474, -74.23561822],
    [4.529688716, -74.23553531]
];

console.log("| LATITUD | LONGITUD | COORDENADA X | COORDENADA Y |");
console.log("|---|---|---|---|");
coords.forEach(([lat, lon]) => {
    const res = convertirA9377(lat, lon);
    console.log(`| ${lat} | ${lon} | ${res.x} | ${res.y} |`);
});
