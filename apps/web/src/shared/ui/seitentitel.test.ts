import { expect, it } from 'bun:test';

import { seitentitel } from './seitentitel.ts';

it('ordnet einer Route einen unterscheidbaren Produkttitel zu', () => {
  expect(seitentitel('Noten')).toBe('Noten · Punktlandung');
  expect(seitentitel('Zeugnis')).not.toBe(seitentitel('Noten'));
});
