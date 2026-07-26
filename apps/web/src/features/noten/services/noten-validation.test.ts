import { describe, expect, it } from 'bun:test';

import { defaultWertungsbereich, isValueValid } from './noten-validation.ts';

describe('defaultWertungsbereich', () => {
  it('ordnet Klausur, Test und GFS dem schriftlichen Bereich zu', () => {
    expect(defaultWertungsbereich('klausur')).toBe('schriftlich');
    expect(defaultWertungsbereich('test')).toBe('schriftlich');
    expect(defaultWertungsbereich('gfs')).toBe('schriftlich');
  });

  it('ordnet Mündlich und Sonstige dem mündlichen Bereich zu', () => {
    expect(defaultWertungsbereich('muendlich')).toBe('muendlich');
    expect(defaultWertungsbereich('sonstige')).toBe('muendlich');
  });
});

describe('isValueValid', () => {
  it('sechser: erlaubt 1,00 bis 6,00 einschließlich Zwischenwerten', () => {
    expect(isValueValid(1, 'sechser')).toBe(true);
    expect(isValueValid(2.75, 'sechser')).toBe(true);
    expect(isValueValid(6, 'sechser')).toBe(true);
    expect(isValueValid(0.75, 'sechser')).toBe(false);
    expect(isValueValid(6.25, 'sechser')).toBe(false);
  });

  it('punkte: erlaubt nur ganze Zahlen von 0 bis 15', () => {
    expect(isValueValid(0, 'punkte')).toBe(true);
    expect(isValueValid(15, 'punkte')).toBe(true);
    expect(isValueValid(10.5, 'punkte')).toBe(false);
    expect(isValueValid(16, 'punkte')).toBe(false);
  });
});
