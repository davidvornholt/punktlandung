import { describe, expect, it } from 'bun:test';
import { railItemHeight, railLayout } from './anstehend-layout.ts';

/** A Thursday, so the first Monday is four days ahead. */
const today = '2026-11-26';

const upcoming = (...days: ReadonlyArray<number>) =>
  days.map((day) => ({ day, height: railItemHeight }));

describe('railLayout', () => {
  it('setzt jede Leistung auf ihren Tag: 17 px je Tag', () => {
    const layout = railLayout({
      items: { missing: [railItemHeight], upcoming: upcoming(2, 5, 9, 16, 24) },
      phone: false,
      today,
    });
    expect(layout.missing).toEqual([30]);
    expect(layout.zero).toBe(76);
    expect(layout.upcoming).toEqual([110, 161, 229, 348, 484]);
    expect(layout.axis).toBe(60);
    expect(layout.axisFrom).toBe(4);
    // The rail ends under the last Leistung, a little past its two days of tail.
    expect(layout.height).toBe(484 + railItemHeight / 2 + 14);
    expect(layout.weeks).toEqual([
      { y: 76 + 4 * 17, text: '30.11.' },
      { y: 76 + 11 * 17, text: '07.12.' },
      { y: 76 + 18 * 17, text: '14.12.' },
      { y: 76 + 25 * 17, text: '21.12.' },
    ]);
  });

  it('beginnt ohne fehlende Note bei heute', () => {
    const layout = railLayout({
      items: { missing: [], upcoming: upcoming(6) },
      phone: false,
      today,
    });
    expect(layout.zero).toBe(10);
    expect(layout.axisFrom).toBe(10);
    expect(layout.upcoming).toEqual([10 + 6 * 17]);
    // At least two weeks of axis, so one Leistung does not stand alone on a stub.
    expect(layout.height).toBe(10 + 14 * 17);
  });

  it('hält die erste Leistung von der Marke für heute frei', () => {
    const layout = railLayout({
      items: { missing: [], upcoming: upcoming(0, 1) },
      phone: false,
      today,
    });
    expect(layout.upcoming).toEqual([44, 94]);
  });

  it('dehnt die Achse, wo Leistungen zu dicht liegen, statt sie vom Tag zu lösen', () => {
    const layout = railLayout({
      items: { missing: [], upcoming: upcoming(3, 4, 4, 11) },
      phone: false,
      today,
    });
    expect(layout.upcoming).toEqual([61, 111, 161, 161 + 7 * 17]);
    // Monday the 30th is day 4: its tick stands where the first Leistung of that day does.
    expect(layout.weeks[0]).toEqual({ y: 111, text: '30.11.' });
    // The following Monday is day 11, where the last Leistung sits.
    expect(layout.weeks[1]).toEqual({ y: 161 + 7 * 17, text: '07.12.' });
  });

  it('rückt Leistungen auseinander, deren Text umbricht', () => {
    const layout = railLayout({
      items: {
        missing: [90, 90],
        upcoming: [
          { day: 2, height: 120 },
          { day: 3, height: 120 },
        ],
      },
      phone: true,
      today,
    });
    expect(layout.missing).toEqual([45, 137]);
    expect(layout.zero).toBe(182 + 16);
    expect(layout.upcoming).toEqual([198 + 62, 198 + 62 + 122]);
    expect(layout.axis).toBe(44);
  });

  it('staucht die Tage nach vier Wochen und zeigt dort nur noch die Montage', () => {
    const layout = railLayout({
      items: { missing: [], upcoming: upcoming(5, 60) },
      phone: false,
      today,
    });
    expect(layout.upcoming).toEqual([95, 10 + 28 * 17 + 32 * 4]);
    const dayTicks = layout.ticks
      .split('M')
      .filter((tick) => tick.includes('h6'));
    expect(dayTicks).toHaveLength(28 - 4);
    expect(layout.weeks).toHaveLength(9);
  });

  it('zeigt unter heute ein kurzes Stück Achse, wenn nur Noten fehlen', () => {
    const layout = railLayout({
      items: { missing: [railItemHeight], upcoming: [] },
      phone: false,
      today,
    });
    expect(layout.upcoming).toEqual([]);
    expect(layout.height).toBe(76 + 3 * 17);
  });
});
