import { describe, expect, it } from 'bun:test';

import { fachLabel, legendTexts, noteParts } from './zeugnis-text.ts';

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

describe('noteParts', () => {
  it('trennt die Notenpunkte von ihrer Einheit', () => {
    expect(noteParts('11 P.')).toEqual({ figure: '11', unit: 'P.' });
    expect(noteParts('10,83 P.')).toEqual({ figure: '10,83', unit: 'P.' });
  });

  it('lässt eine Note ohne Einheit ganz', () => {
    expect(noteParts('2-3')).toEqual({ figure: '2-3', unit: null });
    expect(noteParts('2,75')).toEqual({ figure: '2,75', unit: null });
  });
});

describe('legendTexts', () => {
  it('nennt die Rundung des jeweiligen Notensystems', () => {
    expect(legendTexts('punkte').join(' ')).toContain('ganzen Notenpunkt');
    expect(legendTexts('sechser').join(' ')).toContain('Viertelnote');
  });
});
