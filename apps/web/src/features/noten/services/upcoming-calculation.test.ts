import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { SchoolYearFach } from '#/shared/noten/school-year-fach-snapshot.ts';
import type { UpcomingHalbjahr, UpcomingRow } from './upcoming-calculation.ts';
import { calculateUpcoming } from './upcoming-calculation.ts';

const today = '2026-09-13';

const halbjahr: UpcomingHalbjahr = {
  id: 'hj-1',
  schoolYear: '2026/27',
  system: 'punkte',
  klassenstufe: 'J1',
  half: 1,
};

const fach = (id: string, name: string): SchoolYearFach => ({
  id,
  schoolYear: '2026/27',
  name,
  shortName: name.slice(0, 1),
  gewichtung: standardgewichtung,
  sortOrder: 0,
  archived: false,
});

const faecher = new Map([
  ['2026/27', [fach('mathe', 'Mathematik'), fach('englisch', 'Englisch')]],
]);
const halbjahre = new Map([[halbjahr.id, halbjahr]]);
const noStudyDays = new Map<string, ReadonlyArray<string>>();

const upcoming = (
  rows: ReadonlyArray<UpcomingRow>,
  studyDaysByLeistung: ReadonlyMap<string, ReadonlyArray<string>> = noStudyDays,
) =>
  calculateUpcoming({
    rows,
    halbjahre,
    faecherBySchoolYear: faecher,
    studyDaysByLeistung,
    today,
  });

const row = (
  id: string,
  fachId: string,
  datum: string,
  overrides: Partial<UpcomingRow> = {},
): UpcomingRow => ({
  id,
  termId: 'hj-1',
  fachId,
  kind: 'klausur',
  wert: null,
  gewicht: 1,
  datum,
  preparation: null,
  ...overrides,
});

describe('calculateUpcoming', () => {
  it('trennt bevorstehende von überfälligen Leistungen und zählt die Tage', () => {
    const result = upcoming([
      row('k-heute', 'mathe', '2026-09-13'),
      row('k-vorbei', 'mathe', '2026-09-03'),
      row('k-morgen', 'englisch', '2026-09-14'),
    ]);
    expect(result.upcoming.map((entry) => [entry.id, entry.tageBis])).toEqual([
      ['k-heute', 0],
      ['k-morgen', 1],
    ]);
    expect(result.overdue.map((entry) => [entry.id, entry.tageBis])).toEqual([
      ['k-vorbei', -10],
    ]);
  });

  it('ordnet die Klausur mit dem größeren Anteil vor dem Test, obwohl er früher ist', () => {
    const result = upcoming([
      row('m-k1', 'mathe', '2026-09-19'),
      row('e-t1', 'englisch', '2026-09-16', { kind: 'test' }),
      // Englisch hat schon zwei Klausuren; der eine Test wiegt wie eine dritte.
      row('e-k1', 'englisch', '2026-09-01', { wert: 12 }),
      row('e-k2', 'englisch', '2026-09-05', { wert: 10 }),
    ]);
    // Mathe: 1/(6+1) ≈ 0,143. Englisch-Test: (1/3)/(3+1) ≈ 0,083.
    expect(result.upcoming.map((entry) => entry.id)).toEqual(['m-k1', 'e-t1']);
  });

  it('zeigt den Fachschnitt nur aus benoteten Leistungen des Fachs', () => {
    const result = upcoming([
      row('e-k3', 'englisch', '2026-09-20'),
      row('e-k1', 'englisch', '2026-09-01', { wert: 12 }),
      row('e-k2', 'englisch', '2026-09-05', { wert: 10 }),
      row('m-k1', 'mathe', '2026-09-20'),
    ]);
    const englisch = result.upcoming.find((entry) => entry.id === 'e-k3');
    const mathe = result.upcoming.find((entry) => entry.id === 'm-k1');
    expect(englisch?.fachschnitt).toBe(11);
    expect(mathe?.fachschnitt).toBeNull();
    expect(englisch?.fachName).toBe('Englisch');
    expect(englisch?.halbjahrLabel).toBe('J1.1');
  });

  it('zählt die Themen der Vorbereitung und lässt sichere Leistungen zurückfallen', () => {
    const result = upcoming([
      row('m-k1', 'mathe', '2026-09-15', {
        preparation: '- [x] Integrale\n- [x] Ableitungen',
      }),
      row('e-k1', 'englisch', '2026-09-25', {
        preparation: '## Themen\n- [ ] Vokabeln\n- [x] Grammatik\n- [ ] Essay',
      }),
    ]);
    // Mathe ist näher, aber jedes Thema sitzt; Englisch hat noch zwei offene.
    expect(result.upcoming.map((entry) => entry.id)).toEqual(['e-k1', 'm-k1']);
    expect(result.upcoming[0]?.topics).toEqual({ total: 3, checked: 1 });
    expect(result.upcoming[1]?.topics).toEqual({ total: 2, checked: 2 });
  });

  it('sagt je Leistung, wann zuletzt dafür gelernt wurde', () => {
    const result = upcoming(
      [
        row('m-k1', 'mathe', '2026-09-20'),
        row('e-k1', 'englisch', '2026-09-21'),
      ],
      new Map([['m-k1', ['2026-09-09', '2026-09-11', '2026-08-01']]]),
    );
    const mathe = result.upcoming.find((entry) => entry.id === 'm-k1');
    const englisch = result.upcoming.find((entry) => entry.id === 'e-k1');
    expect(mathe?.lernen).toEqual({ daysAgo: 2, inLastWeek: 2 });
    expect(englisch?.lernen).toEqual({ daysAgo: null, inLastWeek: 0 });
  });

  it('lässt Leistungen ohne bekanntes Halbjahr oder Fach weg', () => {
    const result = upcoming([
      row('fremd', 'mathe', '2026-09-20', { termId: 'hj-x' }),
      row('ohne-fach', 'physik', '2026-09-20'),
    ]);
    expect(result.upcoming).toEqual([]);
    expect(result.overdue).toEqual([]);
  });

  it('reiht Überfälliges nach Datum, ältestes zuerst', () => {
    const result = upcoming([
      row('spaeter', 'mathe', '2026-09-10'),
      row('frueher', 'englisch', '2026-09-01'),
    ]);
    expect(result.overdue.map((entry) => entry.id)).toEqual([
      'frueher',
      'spaeter',
    ]);
  });
});
