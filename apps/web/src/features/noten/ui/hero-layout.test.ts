import { describe, expect, it } from 'bun:test';
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

    it(`hält bei ${width} px jeden Punkt in seiner Spalte und über der Latte`, () => {
      const layout = heroLayout(notes, width);
      const outside = layout.dots.filter((dot, index) => {
        const column = Math.round(notes[index]?.punkte ?? 0);
        return (
          dot.x - dot.r < column * layout.pitch ||
          dot.x + dot.r > (column + 1) * layout.pitch ||
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
