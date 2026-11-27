import { expect, it } from 'bun:test';

import { tieUnits } from './noten-text.ts';

it('bindet jede Zahl an ihre Einheit', () => {
  expect(
    tieUnits('Die Klausur liegt 0,5 P. unter dem Fachschnitt: 40 % von 11 P.'),
  ).toBe('Die Klausur liegt 0,5 P. unter dem Fachschnitt: 40 % von 11 P.');
});

it('lässt einen Satz ohne Einheit, wie er ist', () => {
  expect(tieUnits('Danach steht Deutsch bei 2,15.')).toBe(
    'Danach steht Deutsch bei 2,15.',
  );
});
