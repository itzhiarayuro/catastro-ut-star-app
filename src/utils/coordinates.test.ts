import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCoordinates } from './coordinates';

test('convierte coordenadas DMS pegadas a decimales', () => {
    assert.deepEqual(parseCoordinates(`4°43'39.6"N, 74°26'52.5"W`), {
        lat: 4.7276667,
        lng: -74.4479167,
    });
});

test('rechaza coordenadas inválidas para que el formulario conserve el GPS previo', () => {
    assert.throws(() => parseCoordinates('coordenadas inválidas'), /formato/i);
});
