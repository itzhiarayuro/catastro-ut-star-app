import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFichaAudit } from './fichaAudit';

test('una correccion conserva el propietario y registra al ultimo editor', () => {
  const result = buildFichaAudit(
    { createdBy: 'inspector-1', creatorEmail: 'inspector@example.com', creatorDisplayName: 'Inspector' },
    { uid: 'kelly-1', email: 'kellyvj.icya@gmail.com', displayName: 'Kelly' },
  );
  assert.equal(result.createdBy, 'inspector-1');
  assert.equal(result.creatorEmail, 'inspector@example.com');
  assert.equal(result.lastEditedBy, 'kelly-1');
  assert.equal(result.lastEditorEmail, 'kellyvj.icya@gmail.com');
});

test('una ficha nueva queda a nombre del usuario actual', () => {
  const result = buildFichaAudit({}, { uid: 'inspector-2', email: 'dos@example.com', displayName: null });
  assert.equal(result.createdBy, 'inspector-2');
  assert.equal(result.creatorDisplayName, 'dos');
});
