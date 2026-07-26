import { describe, expect, it } from 'bun:test';

import type { SchuljahrFach } from '#/shared/noten/schuljahr-fachstand.ts';
import {
  berechneJahresvorschau,
  istVollstaendigesSchuljahr,
} from './zeugnis-service.ts';

const fach: SchuljahrFach = {
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
    expect(berechneJahresvorschau(noten, [fach])).toEqual([
      {
        fachId: fach.id,
        fachName: fach.name,
        note: 3,
        grenzfall: false,
      },
    ]);
  });

  it('verlangt ausdrücklich erstes und zweites Halbjahr', () => {
    expect(istVollstaendigesSchuljahr([{ half: 1 }])).toBe(false);
    expect(istVollstaendigesSchuljahr([{ half: 1 }, { half: 1 }])).toBe(false);
    expect(istVollstaendigesSchuljahr([{ half: 2 }, { half: 1 }])).toBe(true);
  });
});
