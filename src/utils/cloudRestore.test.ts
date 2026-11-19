import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCloudFichas } from './cloudRestore';

test('la nube no reemplaza una ficha local pendiente', () => {
    const local = { F1: { id: 'F1', pozo: 'PZ1', synced: false, obs: 'local nueva' } };
    const remote = [{ firestoreId: 'SOPO_PZ1', data: { id: 'F1', pozo: 'PZ1', synced: true, obs: 'nube vieja' } }];
    assert.equal(mergeCloudFichas(local, remote).F1.obs, 'local nueva');
});

test('la descarga agrega fichas y es idempotente', () => {
    const remote = [{ firestoreId: 'SOPO_PZ2', data: { id: 'F2', pozo: 'PZ2' } }];
    const once = mergeCloudFichas({}, remote);
    const twice = mergeCloudFichas(once, remote);
    assert.deepEqual(twice, once);
    assert.equal(twice.F2.synced, true);
});
