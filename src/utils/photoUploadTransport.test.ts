import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadPendingPhotoWithFirebase } from './photoUploadTransport';

test('sube una foto pendiente por Firebase sin depender de GAS_URL', async () => {
    let payload: Record<string, unknown> | undefined;
    const result = await uploadPendingPhotoWithFirebase(async (data) => {
        payload = data;
        return { data: { success: true, driveId: 'drive-123' } };
    }, {
        id: 'foto-1', pozoId: 'PZ003', municipio: 'SIBATÉ', barrio: 'CATASTRO',
        filename: 'PZ003-S1-T.JPG', blob: 'data:image/jpeg;base64,AA==',
        categoria: 'Tuberia', inspector: 'Inspector', timestamp: 1, synced: false,
    });
    assert.equal(payload?.filename, 'PZ003-S1-T.JPG');
    assert.equal(result.driveId, 'drive-123');
});

test('no marca éxito si Firebase rechaza la foto', async () => {
    await assert.rejects(
        uploadPendingPhotoWithFirebase(async () => ({ data: { success: false, error: 'Drive rechazó la foto' } }), {
            id: 'foto-2', pozoId: 'PZ003', municipio: 'SIBATÉ', barrio: 'CATASTRO',
            filename: 'PZ003-S1-Z.JPG', blob: 'data:image/jpeg;base64,AA==',
            categoria: 'Tuberia', inspector: 'Inspector', timestamp: 1, synced: false,
        }),
        /Drive rechazó la foto/,
    );
});
