import { describe, expect, it } from 'bun:test';
import { holdCandidate } from './candidate.ts';
import {
  landedPoints,
  measure,
  type RulerPoint,
  settle,
  settleFlat,
} from './geometry.ts';
import { placePoints } from './parking.ts';
import { punkteScale, sechserScale } from './scale.ts';

const point = (
  id: string,
  value: number | null,
  mass: number,
  date: string,
): RulerPoint => ({
  id,
  value,
  mass,
  kind: 'schriftlich',
  state: value === null ? 'pending' : 'graded',
  date,
});

const today = '2026-11-26';

describe('settle', () => {
  it('lässt eine Scheibe auf der Latte ruhen', () => {
    expect(settle([{ x: 50, y: 0, r: 8 }])).toEqual([{ x: 50, y: -8, r: 8 }]);
  });

  it('stapelt eine spätere Scheibe auf eine frühere am selben Ort', () => {
    const [first, second] = settle([
      { x: 50, y: 0, r: 8 },
      { x: 50, y: 0, r: 5 },
    ]);
    expect(first?.y).toBe(-8);
    expect(second?.y).toBeCloseTo(-8 - 8 - 5 - 0.6, 10);
  });

  it('lässt Scheiben nebeneinander liegen, die sich nicht berühren', () => {
    const [, second] = settle([
      { x: 50, y: 0, r: 8 },
      { x: 80, y: 0, r: 5 },
    ]);
    expect(second?.y).toBe(-5);
  });

  it('lehnt eine Scheibe an ihre Nachbarin, wenn sie sich überlappen würden', () => {
    const [first, second] = settle([
      { x: 50, y: 0, r: 10 },
      { x: 58, y: 0, r: 10 },
    ]);
    const distance = Math.hypot(
      (second?.x ?? 0) - (first?.x ?? 0),
      (second?.y ?? 0) - (first?.y ?? 0),
    );
    expect(distance).toBeCloseTo(20.6, 10);
  });
});

describe('measure', () => {
  const model = {
    fulcrum: 10,
    points: [
      point('a', 11, 0.5, '2026-10-01'),
      point('b', 9, 0.5, '2026-10-20'),
      point('c', null, 0.25, '2026-12-01'),
    ],
  };

  it('gibt der großen Latte am Schreibtisch eine Ablage neben dem Ende', () => {
    const geometry = measure({
      hostWidth: 700,
      model,
      scale: punkteScale,
      variant: 'bench',
    });
    expect(geometry.phone).toBe(false);
    expect(geometry.gutter).toBe(104);
    expect(geometry.pitch).toBeCloseTo((700 - 104 - 2) / 16, 10);
    expect(geometry.labels).toBe(true);
    expect(geometry.holdZone).toBe(0);
  });

  it('hält wartende Scheiben am Telefon über der Latte', () => {
    const geometry = measure({
      hostWidth: 360,
      model,
      scale: punkteScale,
      variant: 'bench',
    });
    expect(geometry.phone).toBe(true);
    expect(geometry.gutter).toBe(0);
    // Die Skala lässt an beiden Enden der Latte Platz: 360 / (16 + 2 · 0,42).
    expect(geometry.pitch).toBeCloseTo(21.378, 3);
    expect(geometry.overhang).toBeCloseTo(0.42 * geometry.pitch, 10);
    expect(geometry.x0).toBe(geometry.overhang);
    expect(geometry.labels).toBe(false);
    expect(geometry.holdZone).toBeGreaterThanOrEqual(30);
    expect(geometry.beam).toBe(36);
  });

  it('schneidet am Telefon keine Scheibe am Rand der Skala ab', () => {
    const cases = [
      { scale: punkteScale, worst: 0, best: 15 },
      { scale: sechserScale, worst: 6, best: 1 },
    ] as const;
    for (const { scale, worst, best } of cases) {
      for (const hostWidth of [360, 390, 559]) {
        const alone = (value: number) => ({
          fulcrum: value,
          points: [point('a', value, 1, '2026-10-01')],
        });
        const geometry = measure({
          hostWidth,
          model: alone(best),
          scale,
          variant: 'bench',
        });
        const [left] = placePoints(alone(worst).points, scale, geometry, today);
        const [right] = placePoints(alone(best).points, scale, geometry, today);
        expect((left?.x ?? 0) - (left?.r ?? 0)).toBeGreaterThanOrEqual(-1e-9);
        expect((right?.x ?? 0) + (right?.r ?? 0)).toBeLessThanOrEqual(
          geometry.width + 1e-9,
        );
        // Die Skala selbst bleibt 16 Einheiten breit, die Latte ragt über sie hinaus.
        expect(geometry.x0 * 2 + 16 * geometry.pitch).toBeCloseTo(
          geometry.width,
          9,
        );
      }
    }
  });

  it('lässt beim Eintragen Platz für eine Scheibe ohne Note', () => {
    const graded = { ...model, points: model.points.slice(0, 2) };
    const options = {
      hostWidth: 360,
      model: graded,
      scale: punkteScale,
      variant: 'bench',
    } as const;
    expect(measure(options).holdZone).toBe(0);
    expect(measure({ ...options, entering: true }).holdZone).toBe(30);
  });

  it('macht die Zeichnung so hoch, dass der höchste Stapel hineinpasst', () => {
    const stacked = {
      fulcrum: 10,
      points: [
        point('a', 10, 0.4, '2026-10-01'),
        point('b', 10, 0.3, '2026-10-02'),
        point('c', 10, 0.3, '2026-10-03'),
      ],
    };
    const geometry = measure({
      hostWidth: 700,
      model: stacked,
      scale: punkteScale,
      variant: 'bench',
    });
    const placed = placePoints(stacked.points, punkteScale, geometry, today);
    const top = Math.min(...placed.map((disc) => disc.y - disc.r));
    expect(geometry.beamY + top).toBeGreaterThan(geometry.top);
  });
});

describe('placePoints', () => {
  const geometry = measure({
    hostWidth: 700,
    model: { fulcrum: null, points: [] },
    scale: punkteScale,
    variant: 'bench',
  });

  it('legt eine Note über ihren Wert und macht die Fläche zum Anteil', () => {
    const [disc] = landedPoints(
      [point('a', 11, 0.25, '2026-10-01')],
      punkteScale,
      geometry,
    );
    expect(disc?.x).toBeCloseTo(geometry.x0 + 11.5 * geometry.pitch, 10);
    expect(disc?.r).toBeCloseTo(geometry.rFull / 2, 10);
    expect(disc?.y).toBeCloseTo(-geometry.rFull / 2, 10);
  });

  it('legt eine Note im Sechsersystem mit der besseren Note nach rechts', () => {
    const [better, worse] = landedPoints(
      [point('a', 1.5, 0.5, '2026-10-01'), point('b', 4, 0.5, '2026-10-02')],
      sechserScale,
      geometry,
    );
    expect(better?.x ?? 0).toBeGreaterThan(worse?.x ?? 0);
  });

  it('hält ausstehende Scheiben neben der Latte, die nähere tiefer', () => {
    const placed = placePoints(
      [
        point('soon', null, 0.25, '2026-11-28'),
        point('later', null, 0.25, '2026-12-20'),
      ],
      punkteScale,
      geometry,
      today,
    );
    const [soon, later] = placed;
    expect(soon?.waiting).toBe(true);
    expect(soon?.x ?? 0).toBeGreaterThan(geometry.x0 + 16 * geometry.pitch);
    expect(later?.y ?? 0).toBeLessThan(soon?.y ?? 0);
  });

  it('legt eine Scheibe, deren Note fehlt, tiefer als jede ausstehende', () => {
    const [missing, pending] = placePoints(
      [
        { ...point('m', null, 0.25, '2026-11-10'), state: 'missing' },
        point('p', null, 0.25, '2026-11-27'),
      ],
      punkteScale,
      geometry,
      today,
    );
    const ground = geometry.beam - (missing?.r ?? 0);
    expect(missing?.y ?? 0).toBeLessThanOrEqual(ground);
    expect(missing?.y ?? 0).toBeGreaterThan(ground - 10);
    expect(pending?.y ?? 0).toBeLessThan(missing?.y ?? 0);
  });
});

describe('holdCandidate', () => {
  const points = [point('a', 11, 0.5, '2026-10-01')];
  const geometry = measure({
    hostWidth: 700,
    model: { fulcrum: 11, points },
    scale: punkteScale,
    variant: 'bench',
  });
  const candidate = {
    value: 11,
    date: '2026-11-26',
    mass: 0.5,
    kind: 'schriftlich',
    fulcrum: 11,
    replaces: null,
    text: '11 P.',
  } as const;

  it('hält die Scheibe über dem Stapel, auf den sie fallen würde', () => {
    const held = holdCandidate({
      candidate,
      geometry,
      points,
      scale: punkteScale,
      today,
    });
    const [resting] = landedPoints(points, punkteScale, geometry);
    expect(held.x).toBeCloseTo(resting?.x ?? 0, 10);
    expect(held.restY).toBeLessThan((resting?.y ?? 0) - (resting?.r ?? 0));
    expect(held.y).toBeLessThanOrEqual(held.restY - 22);
    expect(held.parked).toBe(false);
  });

  it('hält am Telefon die Scheibe ohne Note links von denen, die schon warten', () => {
    const waiting = [...points, point('w', null, 0.3, '2026-12-01')];
    const phone = measure({
      entering: true,
      hostWidth: 390,
      model: { fulcrum: 11, points: waiting },
      scale: punkteScale,
      variant: 'bench',
    });
    const held = holdCandidate({
      candidate: { ...candidate, value: null, text: 'zählt 33 %' },
      geometry: phone,
      points: waiting,
      scale: punkteScale,
      today,
    });
    const other = placePoints(waiting, punkteScale, phone, today).find(
      (disc) => disc.id === 'w',
    );
    // Links von ihr steht, was sie zählt; dort darf keine andere Scheibe warten.
    expect(held.parked).toBe(true);
    expect(held.x + held.r).toBeLessThan((other?.x ?? 0) - (other?.r ?? 0));
  });

  it('lässt die Scheibe, die geändert wird, nicht im Weg liegen', () => {
    const held = holdCandidate({
      candidate: { ...candidate, replaces: 'a' },
      geometry,
      points,
      scale: punkteScale,
      today,
    });
    expect(held.restY).toBeCloseTo(-held.r, 10);
  });

  it('hält eine Scheibe ohne Note dort, wo ausstehende warten', () => {
    const held = holdCandidate({
      candidate: { ...candidate, value: null },
      geometry,
      points,
      scale: punkteScale,
      today,
    });
    expect(held.parked).toBe(true);
    expect(held.x).toBeGreaterThan(geometry.x0 + 16 * geometry.pitch);
  });
});

describe('settleFlat', () => {
  it('legt Scheiben ohne eigene Reihenfolge zum flachsten Haufen', () => {
    // Three discs in neighbouring columns that are narrower than a disc.
    const discs = [
      { id: 'a', x: 0, y: 0, r: 10 },
      { id: 'b', x: 0, y: 0, r: 10 },
      { id: 'c', x: 16, y: 0, r: 10 },
      { id: 'd', x: 32, y: 0, r: 10 },
    ];
    const flat = settleFlat(discs);
    const yOf = (id: string) => flat.find((disc) => disc.id === id)?.y ?? 0;
    // Both outer discs rest on the bar, the middle one in the hollow between them.
    expect(yOf('a')).toBe(-10);
    expect(yOf('d')).toBe(-10);
    expect(yOf('c')).toBeGreaterThan(-30);
    expect(yOf('c')).toBeLessThan(-10);
    // In date order the same discs would climb like a staircase.
    const stacked = settle(discs);
    const top = (pile: ReadonlyArray<{ y: number }>) =>
      Math.min(...pile.map((disc) => disc.y));
    expect(top(flat)).toBeGreaterThan(top(stacked));
  });
});
