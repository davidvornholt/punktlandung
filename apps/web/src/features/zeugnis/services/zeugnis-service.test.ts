import { describe, expect, it } from 'bun:test';

import type { SchoolYearFach } from '#/shared/noten/school-year-fach-snapshot.ts';
import {
  calculateJahresvorschau,
  isCompleteSchoolYear,
} from './zeugnis-service.ts';

const fach: SchoolYearFach = {
  id: 'mathematik',
  schoolYear: '2026/27',
  name: 'Mathematik',
  shortName: 'M',
  schriftlichShare: 50,
  klausurGewichtung: '1',
  testGewichtung: '1',
  muendlichGewichtung: '1',
  gfsGewichtung: '1',
  sonstigeGewichtung: '1',
  sortOrder: 0,
  archived: false,
};

describe('Jahresvorschau', () => {
  it('verwendet alle Leistungen mit dem verkündeten Bereichsanteil', () => {
    const noten = [
      {
        fachId: fach.id,
        notenwert: '2',
        gewichtung: '1',
        leistungsart: 'klausur' as const,
        wertungsbereich: 'schriftlich' as const,
      },
      ...Array.from({ length: 4 }, () => ({
        fachId: fach.id,
        notenwert: '4',
        gewichtung: '1',
        leistungsart: 'muendlich' as const,
        wertungsbereich: 'muendlich' as const,
      })),
    ];
    expect(calculateJahresvorschau(noten, [fach])).toEqual([
      {
        fachId: fach.id,
        fachName: fach.name,
        note: 3,
        grenzfall: false,
      },
    ]);
  });

  it('verlangt ausdrücklich erstes und zweites Halbjahr', () => {
    expect(isCompleteSchoolYear([{ number: 1 }])).toBe(false);
    expect(isCompleteSchoolYear([{ number: 1 }, { number: 1 }])).toBe(false);
    expect(isCompleteSchoolYear([{ number: 2 }, { number: 1 }])).toBe(true);
  });
});
