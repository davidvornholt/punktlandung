import { describe, expect, it } from 'bun:test';

import { fachLabel } from './zeugnis-text.ts';

describe('fachLabel', () => {
  it('markiert ein archiviertes Fach', () => {
    expect(fachLabel({ fachName: 'Latein', archived: true })).toBe(
      'Latein (archiviert)',
    );
  });

  it('lässt ein geführtes Fach unverändert', () => {
    expect(fachLabel({ fachName: 'Mathematik', archived: false })).toBe(
      'Mathematik',
    );
  });
});
