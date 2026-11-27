import { describe, expect, it } from 'bun:test';
import { addDays } from '#/shared/date/date-text.ts';
import { countAt, type VerlaufEntry, verlaufLayout } from './verlauf-layout.ts';

const halbjahre = [
  { id: 'h1', label: '10.1', startsOn: '2025-09-15' },
  { id: 'h2', label: '10.2', startsOn: '2026-02-01' },
  { id: 'h3', label: 'J1.1', startsOn: '2026-09-14' },
];

/** 30 Noten, one every two weeks from October 2025: wild at first, then calm around 10. */
const entries: ReadonlyArray<VerlaufEntry> = Array.from(
  { length: 30 },
  (_, index) => {
    const datum = addDays('2025-10-06', index * 14);
    const halbjahrId = [...halbjahre]
      .reverse()
      .find((halbjahr) => halbjahr.startsOn <= datum)?.id;
    return {
      datum,
      schnitt: index < 3 ? 13 - index * 3 : 10 + ((index * 7) % 5) / 10,
      halbjahrId: halbjahrId ?? 'h1',
    };
  },
);

const today = '2026-11-26';
const layout = verlaufLayout({ entries, halbjahre, hostWidth: 1200, today });

describe('verlaufLayout', () => {
  it('skaliert auf die ruhige Strecke nach den ersten Noten', () => {
    expect(layout.grid.map((line) => line.value)).toEqual([9.5, 10, 10.5, 11]);
    expect(layout.grid.map((line) => line.label)).toEqual([
      null,
      '10\u00a0P.',
      null,
      '11\u00a0P.',
    ]);
  });

  it('nimmt von den ersten Noten jede auf die Skala, die bei gleichem Raster Platz hat', () => {
    const early = [13, 10.8, 9.3];
    const { grid } = verlaufLayout({
      entries: entries.map((entry, index) => ({
        ...entry,
        schnitt: early[index] ?? entry.schnitt,
      })),
      halbjahre,
      hostWidth: 1200,
      today,
    });
    // 13 passt nicht, 10,8 und 9,3 schon: Das Band reicht nach unten bis 9.
    expect(grid.map((line) => line.value)).toEqual([9, 9.5, 10, 10.5, 11]);
  });

  it('vergröbert das Raster, wenn der Schnitt weit schwankt', () => {
    const wild = entries.map((entry, index) => ({
      ...entry,
      schnitt: 4 + (index % 9),
    }));
    const { grid } = verlaufLayout({
      entries: wild,
      halbjahre,
      hostWidth: 1200,
      today,
    });
    expect(grid.map((line) => line.value)).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(grid.every((line) => line.label !== null)).toBe(true);
  });

  it('stellt den Zeiger vor die erste Note, auf jede Note und auf heute', () => {
    expect(layout.hands).toHaveLength(entries.length + 1);
    expect(layout.hands[0]?.x).toBe(0);
    const xs = layout.hands.map((hand) => hand.x);
    expect(xs).toEqual([...xs].sort((left, right) => left - right));
    expect(layout.hands.at(-1)?.x).toBeGreaterThan(layout.plot - 10);
    expect(layout.hands.at(-1)?.x).toBeLessThanOrEqual(layout.plot);
  });

  it('hält den Knopf im Band, auch wenn der Schnitt darüber hinausschießt', () => {
    expect(layout.hands[1]?.y).toBe(6);
    expect(layout.hands[3]?.y).toBe(layout.base);
  });

  it('markiert jedes Halbjahr mit Noten und lässt zu enge Namen weg', () => {
    expect(layout.marks.map((mark) => mark.label)).toEqual([
      '10.1',
      '10.2',
      'J1.1',
    ]);
    expect(layout.marks[0]?.x).toBe(0);
    const narrow = verlaufLayout({
      entries,
      halbjahre: [
        ...halbjahre.slice(0, 2),
        { id: 'h3', label: 'J1.1', startsOn: '2026-02-20' },
      ],
      hostWidth: 390,
      today,
    });
    expect(narrow.marks.map((mark) => mark.label)).toEqual([
      '10.1',
      '10.2',
      null,
    ]);
    expect(narrow.phone).toBe(true);
    expect(narrow.grid.find((line) => line.whole)?.label).toBe('10');
  });

  it('zeichnet die Linie bis heute und lässt Noten ohne Schnitt aus', () => {
    expect(layout.line).toStartWith('M');
    expect(layout.line).toEndWith(`H${layout.hands.at(-1)?.x}`);
    const open = verlaufLayout({
      entries: entries.map((entry) => ({ ...entry, schnitt: null })),
      halbjahre,
      hostWidth: 1200,
      today,
    });
    expect(open.line).toBe('');
    expect(open.grid.map((line) => line.value)).toEqual([0, 5, 10, 15]);
  });

  it('kommt ohne Noten aus', () => {
    const empty = verlaufLayout({
      entries: [],
      halbjahre,
      hostWidth: 1200,
      today,
    });
    expect(empty.hands).toEqual([{ x: 0, y: empty.base }]);
    expect(empty.marks).toEqual([]);
  });
});

describe('countAt', () => {
  it('zählt die Noten bis zu dem Tag, auf den der Zeiger zeigt', () => {
    expect(countAt(layout, entries, 0)).toBe(0);
    expect(countAt(layout, entries, layout.plot)).toBe(entries.length);
    for (const count of [1, 2, 12, 29]) {
      expect(countAt(layout, entries, layout.hands[count]?.x ?? 0)).toBe(count);
    }
  });

  it('meint am rechten Ende heute', () => {
    expect(countAt(layout, entries, layout.plot - 3)).toBe(entries.length);
    expect(countAt(layout, entries, -40)).toBe(0);
  });
});
