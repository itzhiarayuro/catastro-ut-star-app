import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PipeStateField } from './PipeStateField';

test('un ramal con estado OTRO permite especificar el estado real', () => {
    const html = renderToStaticMarkup(
        React.createElement(PipeStateField, {
            value: 'OTRO',
            onChange: () => undefined,
        })
    );

    assert.match(html, /Especifique Estado/i);
    assert.match(html, /type="text"/);
});
