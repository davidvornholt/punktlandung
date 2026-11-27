import { describe, expect, it } from 'bun:test';
import { tenths } from '#/shared/ui/ruler/geometry.ts';
import { punkteScale } from '#/shared/ui/ruler/scale.ts';
import { type HeroNote, heroLayout } from './hero-layout.ts';

/** Three school years: many light Noten in the old ones, a few heavy ones in the current one. */
const notes: ReadonlyArray<HeroNote> = [
  ...Array.from({ length: 120 }, (_, index) => ({
    punkte: 4 + ((index * 7) % 11) + (index % 3) * 0.25,
    mass: 1 / 160,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    punkte: 8 + ((index * 5) % 6),
    mass: index % 2 === 0 ? 1 / 40 : 1 / 80,
  })),
];

const desktop = 1200;
const phone = 390;

/** Where the fulcrum is drawn for a Schnitt of `punkte`. */
const placeOf = (punkte: number, pitch: number): number =>
  punkteScale.unitOf(punkte) * pitch;

/** The share of a unit a pile may take, as the layout has it. */
const columnShare = 0.74;

/** How far a dot may lie beside its own value: as far as its pile's width lets it. */
const reachOf = (r: number, pitch: number): number =>
  Math.max(0, (pitch * columnShare) / 2 - r) + 0.06;

/** Whole Notenpunkte only, as the Kursstufe gives them. */
const wholeNotes: ReadonlyArray<HeroNote> = Array.from(
  { length: 48 },
  (_, index) => ({
    punkte: 3 + ((index * 7) % 12),
    mass: index % 5 === 0 ? 1 / 20 : 1 / 60,
  }),
);

describe('heroLayout', () => {
  for (const width of [desktop, phone]) {
    it(`legt bei ${width} px keine zwei Punkte übereinander`, () => {
      const { dots } = heroLayout(notes, width);
      const overlapping = dots.flatMap((dot, index) =>
        dots
          .slice(index + 1)
          .filter(
            (other) =>
              Math.hypot(dot.x - other.x, dot.y - other.y) <
              dot.r + other.r - 0.2,
          ),
      );
      expect(overlapping).toEqual([]);
    });

    it(`hält bei ${width} px jeden Punkt bei seinem Wert und über der Latte`, () => {
      const layout = heroLayout(notes, width);
      const outside = layout.dots.filter((dot, index) => {
        const place = placeOf(notes[index]?.punkte ?? 0, layout.pitch);
        return (
          Math.abs(dot.x - place) > reachOf(dot.r, layout.pitch) ||
          dot.y + dot.r > layout.beamY + 0.25 ||
          dot.y - dot.r < 0
        );
      });
      expect(outside).toEqual([]);
    });
  }

  it('zeichnet die Fläche eines Punkts im Verhältnis zu seinem Anteil', () => {
    const { dots } = heroLayout(notes, desktop);
    const heavy = dots.at(-2);
    const light = dots.at(-1);
    expect(heavy?.r).toBeGreaterThan(light?.r ?? 0);
    expect(((heavy?.r ?? 0) / (light?.r ?? 1)) ** 2).toBeCloseTo(2, 1);
  });

  it('legt jeden Punkt auf die Latte oder auf frühere Punkte', () => {
    const layout = heroLayout(notes, desktop);
    // A dot rests on the bar or touches a dot that landed before it and lies
    // lower: taking the later Noten away leaves nothing hanging in the air.
    const hanging = layout.dots.filter((dot, index) => {
      const onBar = Math.abs(dot.y + dot.r - layout.beamY) < 0.25;
      const onEarlier = layout.dots
        .slice(0, index)
        .some(
          (other) =>
            other.y > dot.y &&
            Math.hypot(dot.x - other.x, dot.y - other.y) < dot.r + other.r + 1,
        );
      return !(onBar || onEarlier);
    });
    expect(hanging).toEqual([]);
  });

  it('lässt die Stapel nicht über die Figur hinauswachsen', () => {
    const many = Array.from({ length: 900 }, (_, index) => ({
      punkte: 9 + (index % 3),
      mass: index < 890 ? 1 / 2000 : 1 / 20,
    }));
    const layout = heroLayout(many, desktop);
    expect(layout.beamY).toBeLessThan(420);
    const narrow = heroLayout(many, phone);
    expect(narrow.phone).toBe(true);
    expect(narrow.beamY).toBeLessThan(260);
  });

  it('hat auch ohne Noten eine Latte mit Platz darüber', () => {
    const layout = heroLayout([], desktop);
    expect(layout.dots).toEqual([]);
    expect(layout.beamY).toBeGreaterThan(40);
    expect(layout.height).toBeGreaterThan(layout.beamY + layout.beam);
  });
});

describe('heroLayout: der Platz eines Punkts', () => {
  it('legt eine einzelne Note zwischen zwei Notenpunkten genau über das Lager', () => {
    // 2-3 im Sechsersystem sind 9,5 Notenpunkte: Mit ihr allein steht das Lager bei 9,5.
    const layout = heroLayout([{ punkte: 9.5, mass: 1 }], desktop);
    expect(layout.dots[0]?.x).toBe(tenths(placeOf(9.5, layout.pitch)));
  });

  it('legt eine Note zwischen zwei Stapeln auf deren Schultern', () => {
    const between = [9, 10, 9.5].map((punkte) => ({ punkte, mass: 1 / 3 }));
    const layout = heroLayout(between, desktop);
    const [left, right, dot] = layout.dots;
    if (left === undefined || right === undefined || dot === undefined) {
      throw new Error('three dots expected');
    }
    expect(Math.abs(dot.x - placeOf(9.5, layout.pitch))).toBeLessThanOrEqual(
      reachOf(dot.r, layout.pitch),
    );
    for (const other of [left, right]) {
      expect(
        Math.hypot(dot.x - other.x, dot.y - other.y),
      ).toBeGreaterThanOrEqual(dot.r + other.r - 0.2);
    }
    // The two under it lie on the bar over their own Notenpunkte, as without it.
    expect([left.x, right.x]).toEqual([
      placeOf(9, layout.pitch),
      placeOf(10, layout.pitch),
    ]);
    expect([left.y + left.r, right.y + right.r]).toEqual([
      layout.beamY,
      layout.beamY,
    ]);
    expect(dot.y).toBeLessThan(left.y);
  });

  it('legt ganze Notenpunkte wie zuvor in ihre Stapel', () => {
    // Positions the layout gave these Noten while it still piled by whole column.
    const wide = heroLayout(wholeNotes, desktop);
    expect([wide.beamY, wide.height]).toEqual([131, 363]);
    expect([0, 5, 17, 30, 47].map((index) => wide.dots[index])).toEqual([
      { x: 262.5, y: 108.5, r: 22.5 },
      { x: 1087.5, y: 108.5, r: 22.5 },
      { x: 1073, y: 75.5, r: 13 },
      { x: 717.5, y: 65.4, r: 22.5 },
      { x: 623, y: 35, r: 13 },
    ]);
    const narrow = heroLayout(wholeNotes, phone);
    expect([narrow.beamY, narrow.height]).toEqual([73, 243]);
    expect([0, 5, 17, 30, 47].map((index) => narrow.dots[index])).toEqual([
      { x: 85.3, y: 62.5, r: 10.5 },
      { x: 353.4, y: 62.5, r: 10.5 },
      { x: 350.9, y: 45.6, r: 6.1 },
      { x: 231.6, y: 37.5, r: 10.5 },
      { x: 204.7, y: 20.6, r: 6.1 },
    ]);
  });
});
