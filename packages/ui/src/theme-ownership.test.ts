import { expect, it } from 'bun:test';

import packageManifest from '../package.json' with { type: 'json' };

it('publishes theme.css as the only design-value API', () => {
  expect(packageManifest.exports).toEqual({
    './theme.css': './src/theme.css',
  });
});
