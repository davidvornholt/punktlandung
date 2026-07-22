import { describe, expect, it } from 'bun:test';

import { istWertGueltig, standardBereich } from './notenpruefung.ts';

describe('standardBereich', () => {
  it('ordnet Klausur, Test und GFS dem schriftlichen Bereich zu', () => {
    expect(standardBereich('klausur')).toBe('schriftlich');
    expect(standardBereich('test')).toBe('schriftlich');
    expect(standardBereich('gfs')).toBe('schriftlich');
  });

  it('ordnet Mündlich und Sonstige dem mündlichen Bereich zu', () => {
    expect(standardBereich('muendlich')).toBe('muendlich');
    expect(standardBereich('sonstige')).toBe('muendlich');
  });
});

describe('istWertGueltig', () => {
  it('sechser: erlaubt 1,00 bis 6,00 einschließlich Zwischenwerten', () => {
    expect(istWertGueltig(1, 'sechser')).toBe(true);
    expect(istWertGueltig(2.75, 'sechser')).toBe(true);
    expect(istWertGueltig(6, 'sechser')).toBe(true);
    expect(istWertGueltig(0.75, 'sechser')).toBe(false);
    expect(istWertGueltig(6.25, 'sechser')).toBe(false);
  });

  it('punkte: erlaubt nur ganze Zahlen von 0 bis 15', () => {
    expect(istWertGueltig(0, 'punkte')).toBe(true);
    expect(istWertGueltig(15, 'punkte')).toBe(true);
    expect(istWertGueltig(10.5, 'punkte')).toBe(false);
    expect(istWertGueltig(16, 'punkte')).toBe(false);
  });
});
