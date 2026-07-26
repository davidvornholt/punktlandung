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
  gewichtung: {
    verhaeltnis: { schriftlich: 50, muendlich: 50 },
    arten: {
      klausur: { gewicht: 1, sammlung: 'einzeln' },
      test: { gewicht: 1, sammlung: 'einzeln' },
      muendlich: { gewicht: 1, sammlung: 'einzeln' },
      gfs: { gewicht: 1, sammlung: 'einzeln' },
      sonstige: { gewicht: 1, sammlung: 'einzeln' },
    },
  },
  sortOrder: 0,
  archived: false,
};

describe('Jahresvorschau', () => {
  it('verwendet alle Leistungen mit dem verkündeten Bereichsanteil', () => {
    const noten = [
      {
        subjectId: fach.id,
        value: '2',
        weight: '1',
        kind: 'klausur' as const,
      },
      ...Array.from({ length: 4 }, () => ({
        subjectId: fach.id,
        value: '4',
        weight: '1',
        kind: 'muendlich' as const,
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
    expect(isCompleteSchoolYear([{ half: 1 }])).toBe(false);
    expect(isCompleteSchoolYear([{ half: 1 }, { half: 1 }])).toBe(false);
    expect(isCompleteSchoolYear([{ half: 2 }, { half: 1 }])).toBe(true);
  });
});
