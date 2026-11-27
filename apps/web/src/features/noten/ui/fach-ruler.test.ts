import { describe, expect, it } from 'bun:test';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import type { Leistung } from '../services/noten-service.ts';
import { fachRuler, leistungShares, leistungState } from './fach-ruler.ts';

const today = '2026-11-26';

const base = {
  gewicht: 1,
  notiz: null,
  fachId: 'physik',
  fachName: 'Physik',
  fachKuerzel: 'Ph',
  gewichtung: standardgewichtung,
} as const;

const graded = (
  id: string,
  kind: Leistung['kind'],
  wert: number,
  datum: string,
): Leistung => ({ ...base, id, kind, datum, status: 'graded', wert });

const planned = (
  id: string,
  kind: Leistung['kind'],
  datum: string,
): Leistung => ({ ...base, id, kind, datum, status: 'planned' });

const twoToOne: Fachgewichtung = {
  ...standardgewichtung,
  verhaeltnis: { schriftlich: 2, muendlich: 1 },
};

const leistungen = [
  graded('k1', 'klausur', 11, '2026-09-28'),
  graded('t1', 'test', 8, '2026-11-05'),
  graded('m1', 'muendlich', 13, '2026-10-30'),
  planned('k2', 'klausur', '2026-12-08'),
  planned('g1', 'gfs', '2026-11-12'),
];

/** Where the discs with a Note balance: the mean of their values, weighted by their masses. */
const balancePoint = (ruler: ReturnType<typeof fachRuler>): number => {
  const landed = ruler.model.points.filter((point) => point.value !== null);
  const mass = landed.reduce((sum, point) => sum + point.mass, 0);
  return (
    landed.reduce((sum, point) => sum + point.mass * (point.value ?? 0), 0) /
    mass
  );
};

describe('fachRuler', () => {
  for (const [name, gewichtung] of [
    ['einer gemeinsamen Liste', standardgewichtung],
    ['einem Verhältnis der Bereiche', twoToOne],
  ] as const) {
    it(`stellt den Drehpunkt bei ${name} genau unter den Fachschnitt`, () => {
      const ruler = fachRuler({
        gewichtung,
        leistungen,
        system: 'punkte',
        today,
      });
      expect(ruler.model.fulcrum).not.toBeNull();
      expect(balancePoint(ruler)).toBeCloseTo(ruler.model.fulcrum ?? 0, 10);
      const landedMass = ruler.model.points
        .filter((point) => point.value !== null)
        .reduce((sum, point) => sum + point.mass, 0);
      expect(landedMass).toBeCloseTo(1, 10);
    });
  }

  it('unterscheidet ausstehend von fehlend am Termin', () => {
    const ruler = fachRuler({
      gewichtung: standardgewichtung,
      leistungen,
      system: 'punkte',
      today,
    });
    const stateOf = (id: string) =>
      ruler.model.points.find((point) => point.id === id)?.state;
    expect(stateOf('k1')).toBe('graded');
    expect(stateOf('k2')).toBe('pending');
    expect(stateOf('g1')).toBe('missing');
    expect(leistungState(planned('x', 'test', today), today)).toBe('pending');
  });

  it('beschriftet jede Scheibe für die Figur, den Tooltip und als Link', () => {
    const ruler = fachRuler({
      gewichtung: standardgewichtung,
      leistungen,
      system: 'punkte',
      today,
    });
    const pointOf = (id: string) =>
      ruler.model.points.find((point) => point.id === id);
    expect(pointOf('k1')?.note).toBe('Klausur · 28.09.');
    expect(pointOf('k1')?.label).toBe('Klausur vom 28.09.2026, 11 P.');
    expect(pointOf('k1')?.tip).toContain('Klausur · 28.09. · 11 P. · zählt ');
    expect(pointOf('k2')?.note).toBe('Klausur\nin 12 Tagen');
    expect(pointOf('k2')?.tip).toContain('ausstehend · zählt später ');
    expect(pointOf('g1')?.note).toBe('GFS\nNote fehlt');
    expect(pointOf('g1')?.label).toBe('GFS vom 12.11.2026, Note fehlt noch');
    expect(pointOf('m1')?.kind).toBe('muendlich');
    expect(pointOf('t1')?.kind).toBe('schriftlich');
  });

  it('hebt die Scheibe hervor, um die es geht, und nimmt die anderen zurück', () => {
    const ruler = fachRuler({
      focusId: 't1',
      gewichtung: standardgewichtung,
      leistungen,
      system: 'punkte',
      today,
    });
    expect(
      ruler.model.points.filter((point) => point.focus).map((p) => p.id),
    ).toEqual(['t1']);
    expect(ruler.model.points.filter((point) => point.dim)).toHaveLength(4);
  });

  it('nimmt die anderen nicht zurück, solange die Leistung keine Note hat', () => {
    const ruler = fachRuler({
      focusId: 'k2',
      gewichtung: standardgewichtung,
      leistungen,
      system: 'punkte',
      today,
    });
    expect(
      ruler.model.points.filter((point) => point.focus).map((p) => p.id),
    ).toEqual(['k2']);
    expect(ruler.model.points.filter((point) => point.dim)).toEqual([]);
  });

  it('hat ohne Note keinen Drehpunkt', () => {
    const ruler = fachRuler({
      gewichtung: standardgewichtung,
      leistungen: [planned('k2', 'klausur', '2026-12-08')],
      system: 'punkte',
      today,
    });
    expect(ruler.model.fulcrum).toBeNull();
    expect(ruler.shares.get('k2')).toBe(1);
  });
});

describe('leistungShares', () => {
  it('rechnet eine Note unter den vorhandenen Noten und eine ausstehende unter allen', () => {
    const shares = leistungShares(leistungen, standardgewichtung);
    const gradedTotal = ['k1', 't1', 'm1'].reduce(
      (sum, id) => sum + (shares.get(id) ?? 0),
      0,
    );
    expect(gradedTotal).toBeCloseTo(1, 10);
    expect(shares.get('k2')).toBeGreaterThan(0);
    expect(shares.get('k2')).toBeLessThan(shares.get('k1') ?? 0);
  });
});
