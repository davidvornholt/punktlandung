import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import { artDisc, gewichtungGroups } from './gewichtung-figure-model.ts';

const withArten = (
  arten: Partial<Fachgewichtung['arten']>,
  verhaeltnis: Fachgewichtung['verhaeltnis'] = null,
): Fachgewichtung => ({
  verhaeltnis,
  arten: { ...standardgewichtung.arten, ...arten },
});

describe('gewichtungGroups', () => {
  it('zeigt ohne Verhältnis eine Liste, in der alle Arten vergleichbar sind', () => {
    const groups = gewichtungGroups(standardgewichtung);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.bereich).toBeNull();
    expect(groups[0]?.percent).toBeNull();
    expect(groups[0]?.discs.map((disc) => disc.label)).toEqual([
      'Klausur',
      'GFS',
      'Tests zusammen',
      'Mündlich',
      'Sonstige',
    ]);
    expect(groups[0]?.discs.every((disc) => disc.area === 1)).toBe(true);
    expect(groups[0]?.discs.every((disc) => disc.factor === null)).toBe(true);
  });

  it('teilt mit Verhältnis nach Wertungsbereich und nennt die Anteile', () => {
    const groups = gewichtungGroups(
      withArten({}, { schriftlich: 3, muendlich: 1 }),
    );

    expect(groups.map((entry) => [entry.bereich, entry.percent])).toEqual([
      ['schriftlich', 75],
      ['muendlich', 25],
    ]);
    expect(groups[0]?.discs.map((disc) => disc.kind)).toEqual([
      'klausur',
      'gfs',
      'test',
    ]);
    expect(groups[1]?.discs.map((disc) => disc.kind)).toEqual([
      'muendlich',
      'sonstige',
    ]);
  });

  it('macht die Fläche einer Scheibe zum Gewicht neben dem größten der Gruppe', () => {
    const gewichtung = withArten({
      klausur: { gewicht: 2, sammlung: 'einzeln' },
      sonstige: { gewicht: 0.5, sammlung: 'einzeln' },
    });

    expect(artDisc(gewichtung, 'klausur')).toMatchObject({
      area: 1,
      factor: '×2',
    });
    expect(artDisc(gewichtung, 'muendlich')).toMatchObject({
      area: 0.5,
      factor: null,
    });
    expect(artDisc(gewichtung, 'sonstige')).toMatchObject({
      area: 0.25,
      factor: '×0,5',
    });
  });

  it('vergleicht mit Verhältnis nur innerhalb eines Wertungsbereichs', () => {
    const gewichtung = withArten(
      {
        klausur: { gewicht: 2, sammlung: 'einzeln' },
        gfs: { gewicht: 2, sammlung: 'einzeln' },
        test: { gewicht: 2, sammlung: 'gesammelt' },
        sonstige: { gewicht: 0.5, sammlung: 'einzeln' },
      },
      { schriftlich: 60, muendlich: 40 },
    );

    // Alle schriftlichen Arten zählen doppelt: untereinander ändert das nichts.
    expect(artDisc(gewichtung, 'klausur')).toMatchObject({
      area: 1,
      factor: null,
    });
    expect(artDisc(gewichtung, 'test')).toMatchObject({
      area: 1,
      factor: null,
      shared: true,
    });
    expect(artDisc(gewichtung, 'muendlich')?.area).toBe(1);
    expect(artDisc(gewichtung, 'sonstige')).toMatchObject({
      area: 0.5,
      factor: '×0,5',
    });
  });

  it('nennt einzeln zählende Tests in der Einzahl', () => {
    const gewichtung = withArten({
      test: { gewicht: 0.5, sammlung: 'einzeln' },
    });

    expect(artDisc(gewichtung, 'test')).toMatchObject({
      label: 'Test',
      shared: false,
      factor: '×0,5',
    });
  });

  it('rechnet ein Verhältnis ohne zählenden Bereich nicht in Prozent um', () => {
    const groups = gewichtungGroups(
      withArten({}, { schriftlich: 0, muendlich: 0 }),
    );

    expect(groups.map((entry) => entry.percent)).toEqual([0, 0]);
  });
});
