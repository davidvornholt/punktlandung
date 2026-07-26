import { describe, expect, it } from 'bun:test';

import {
  istFachWaehlbar,
  istWertGueltig,
  standardBereich,
} from './notenpruefung.ts';

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

describe('istFachWaehlbar', () => {
  const gefuehrt = { id: 'biologie', archived: false };
  const archiviert = { id: 'latein', archived: true };

  it('lehnt ein Fach ab, das nicht zum Schuljahr gehört', () => {
    expect(istFachWaehlbar(undefined, null)).toBe(false);
    expect(istFachWaehlbar(undefined, 'latein')).toBe(false);
  });

  it('erlaubt jedes geführte Fach', () => {
    expect(istFachWaehlbar(gefuehrt, null)).toBe(true);
    expect(istFachWaehlbar(gefuehrt, 'latein')).toBe(true);
  });

  it('lässt eine Note an ihrem archivierten Fach korrigierbar', () => {
    expect(istFachWaehlbar(archiviert, 'latein')).toBe(true);
  });

  it('lässt keine Note in ein archiviertes Fach umziehen', () => {
    expect(istFachWaehlbar(archiviert, null)).toBe(false);
    expect(istFachWaehlbar(archiviert, 'biologie')).toBe(false);
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
