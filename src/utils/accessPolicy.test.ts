import assert from 'node:assert/strict';
import test from 'node:test';
import { getFichaPermissions } from './accessPolicy';

test('Kelly puede ver y editar todas las fichas sin eliminar ni mantener Drive', () => {
    assert.deepEqual(getFichaPermissions('  KELLYVJ.ICYА@GMAIL.COM  '.replace('А', 'A')), {
        viewAll: true,
        editAll: true,
        deleteAll: false,
        deleteOwn: false,
        driveMaintenance: false,
    });
});

test('un inspector no recibe permisos globales', () => {
    assert.deepEqual(getFichaPermissions('inspector@example.com'), {
        viewAll: false,
        editAll: false,
        deleteAll: false,
        deleteOwn: true,
        driveMaintenance: false,
    });
});
