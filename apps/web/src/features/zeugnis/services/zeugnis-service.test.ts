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
        archived: false,
        note: 3,
        grenzfall: false,
      },
    ]);
  });

  it('rundet einen exakten Schnitt von 2,5 zur schlechteren Note', () => {
    const dreiZuZwei: SchoolYearFach = {
      ...fach,
      gewichtung: {
        ...fach.gewichtung,
        verhaeltnis: { schriftlich: 3, muendlich: 2 },
      },
    };
    // Schriftlich 2,8 und mündlich 2,05 ergeben bei 3:2 exakt 2,5.
    const noten = [
      { value: '2', weight: '1', kind: 'klausur' as const },
      { value: '3', weight: '4', kind: 'klausur' as const },
      { value: '2.25', weight: '1', kind: 'muendlich' as const },
      { value: '2', weight: '4', kind: 'muendlich' as const },
    ].map((note) => ({ ...note, subjectId: fach.id }));
    expect(calculateJahresvorschau(noten, [dreiZuZwei])).toEqual([
      {
        fachId: fach.id,
        fachName: fach.name,
        archived: false,
        note: 3,
        grenzfall: true,
      },
    ]);
  });

  it('rundet einen Schnitt knapp unter 2,5 weiter zur besseren Note', () => {
    const knappDarunter: SchoolYearFach = {
      ...fach,
      gewichtung: {
        verhaeltnis: { schriftlich: 97, muendlich: 99 },
        arten: {
          klausur: { gewicht: 9.25, sammlung: 'einzeln' },
          test: { gewicht: 9.25, sammlung: 'einzeln' },
          muendlich: { gewicht: 9.5, sammlung: 'einzeln' },
          gfs: { gewicht: 10, sammlung: 'einzeln' },
          sonstige: { gewicht: 9.25, sammlung: 'einzeln' },
        },
      },
    };
    // Der exakte Schnitt liegt 6/176661973600 unter 2,5: echt, kein Rauschen.
    const noten = [
      { value: '4.55', weight: '9.75', kind: 'klausur' as const },
      { value: '1.33', weight: '10', kind: 'gfs' as const },
      { value: '2.56', weight: '9.75', kind: 'muendlich' as const },
      { value: '1.74', weight: '10', kind: 'sonstige' as const },
    ].map((note) => ({ ...note, subjectId: fach.id }));
    expect(calculateJahresvorschau(noten, [knappDarunter])).toEqual([
      {
        fachId: fach.id,
        fachName: fach.name,
        archived: false,
        note: 2,
        grenzfall: true,
      },
    ]);
  });

  it('verlangt ausdrücklich erstes und zweites Halbjahr', () => {
    expect(isCompleteSchoolYear([{ half: 1 }])).toBe(false);
    expect(isCompleteSchoolYear([{ half: 1 }, { half: 1 }])).toBe(false);
    expect(isCompleteSchoolYear([{ half: 2 }, { half: 1 }])).toBe(true);
  });
});
