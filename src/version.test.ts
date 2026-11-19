import test from 'node:test';
import assert from 'node:assert/strict';
import packageJson from '../package.json' with { type: 'json' };
import { APP_VERSION } from './version';

test('la version visible coincide con el paquete', () => assert.equal(APP_VERSION, packageJson.version));
