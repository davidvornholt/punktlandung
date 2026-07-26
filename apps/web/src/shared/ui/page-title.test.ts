import { expect, it } from 'bun:test';

import { pageTitle } from './page-title.ts';

it('ordnet einer Route einen unterscheidbaren Produkttitel zu', () => {
  expect(pageTitle('Noten')).toBe('Noten · Punktlandung');
  expect(pageTitle('Zeugnis')).not.toBe(pageTitle('Noten'));
});
