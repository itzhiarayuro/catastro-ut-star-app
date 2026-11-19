import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhotoType } from './photoTypes';

test('normaliza tipos historicos de foto en mayusculas o minusculas', () => {
    assert.equal(normalizePhotoType('GENERAL'), 'general');
    assert.equal(normalizePhotoType('Interior'), 'interior');
    assert.equal(normalizePhotoType('tapa'), 'tapa');
});
