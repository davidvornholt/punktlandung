import { describe, expect, it } from 'bun:test';
import { dimensionLine } from './dimension.ts';
import { measure, type RulerPoint, tenths } from './geometry.ts';
import { figureLabels } from './labels.ts';
import { placePoints } from './parking.ts';
import { punkteScale } from './scale.ts';

const today = '2026-11-26';

const note = (
  id: string,
  value: number | null,
  extra: Partial<RulerPoint> = {},
): RulerPoint => ({
  id,
  value,
  mass: 0.2,
  kind: 'schriftlich',
  state: value === null ? 'pending' : 'graded',
  date: `2026-10-${id.padStart(2, '0')}`,
  note: `Klausur · ${id.padStart(2, '0')}.10.`,
  ...extra,
});

const figure = (points: ReadonlyArray<RulerPoint>, hostWidth: number) => {
  const model = { points, fulcrum: 10 };
  const geometry = measure({
    hostWidth,
    model,
    scale: punkteScale,
    variant: 'bench',
  });
  const placed = placePoints(points, punkteScale, geometry, today);
  return { geometry, placed, labels: figureLabels(placed, geometry) };
};

/** The span a label's text covers, estimated the way the layout estimates it. */
const span = (label: {
  readonly x: number;
  readonly anchor: string;
  readonly lines: ReadonlyArray<string>;
}): [number, number] => {
  const width = (label.lines[0]?.length ?? 0) * 7;
  if (label.anchor === 'middle') {
    return [label.x - width / 2, label.x + width / 2];
  }
  return label.anchor === 'start'
    ? [label.x, label.x + width]
    : [label.x - width, label.x];
};

describe('figureLabels', () => {
  it('benennt jede Scheibe, solange Platz ist', () => {
    const { labels } = figure([note('1', 4), note('2', 9), note('3', 14)], 900);
    expect(labels.map((label) => label.id)).toEqual(['1', '2', '3']);
    expect(labels.every((label) => label.anchor === 'middle')).toBe(true);
  });

  it('druckt in einer vollen Figur keine Beschriftung über eine andere', () => {
    const crowded = [9, 10, 10, 11, 11, 11, 12, 12, 13].map((value, index) =>
      note(String(index + 1), value),
    );
    const { labels } = figure(crowded, 760);
    expect(labels.length).toBeGreaterThan(2);
    expect(labels.length).toBeLessThan(crowded.length);
    const overlapping = labels.flatMap((label) =>
      labels.filter((other) => {
        const [from, to] = span(label);
        const [otherFrom, otherTo] = span(other);
        return (
          label !== other &&
          label.y === other.y &&
          to > otherFrom &&
          otherTo > from
        );
      }),
    );
    expect(overlapping).toEqual([]);
  });

  it('behält die Beschriftung der Scheibe, um die es geht, auch im Gedränge', () => {
    const crowded = [9, 10, 10, 11, 11, 11, 12, 12, 13].map((value, index) =>
      note(String(index + 1), value, { focus: index === 8 }),
    );
    const { labels } = figure(crowded, 760);
    expect(labels.some((label) => label.id === '9' && label.focus)).toBe(true);
  });

  it('lässt keine Beschriftung über den Rand der Figur ragen', () => {
    const { geometry, labels } = figure([note('1', 0), note('2', 15)], 760);
    expect(labels).toHaveLength(2);
    for (const label of labels) {
      const [from, to] = span(label);
      expect(from).toBeGreaterThanOrEqual(-1);
      expect(to).toBeLessThanOrEqual(geometry.width + 1);
    }
  });

  it('nennt auf dem Telefon nur, wie viele Noten ausstehen', () => {
    const { labels } = figure(
      [note('1', 11), note('2', null), note('3', null)],
      360,
    );
    expect(labels.map((label) => label.lines)).toEqual([['2 ausstehend']]);
  });
});

describe('dimensionLine', () => {
  const points = [note('1', 8, { focus: true }), note('2', 12), note('3', 12)];

  it('misst den Abstand der Scheibe zum Drehpunkt', () => {
    const { geometry, placed } = figure(points, 900);
    const focus = placed.find((point) => point.id === '1');
    const fulcrumX = geometry.x0 + punkteScale.unitOf(10.67) * geometry.pitch;
    const line = dimensionLine({
      focusId: '1',
      fulcrumX,
      geometry,
      placed,
      text: '2,67 P. unter dem Fachschnitt',
    });
    expect(line?.line.startsWith(`M${tenths(focus?.x ?? 0)} `)).toBe(true);
    expect(line?.heads).not.toBeNull();
    // The line runs above everything that lies on the bar.
    const top = Math.min(...placed.map((point) => point.y - point.r));
    expect(line?.text.y).toBeLessThan(top);
  });

  it('entfällt, wenn die Scheibe im Drehpunkt liegt oder kein Platz für Beschriftung ist', () => {
    const { geometry, placed } = figure(points, 900);
    const focus = placed.find((point) => point.id === '1');
    expect(
      dimensionLine({
        focusId: '1',
        fulcrumX: focus?.x ?? 0,
        geometry,
        placed,
        text: 'im Fachschnitt',
      }),
    ).toBeNull();
    const phone = figure(points, 360);
    expect(
      dimensionLine({
        focusId: '1',
        fulcrumX: 200,
        geometry: phone.geometry,
        placed: phone.placed,
        text: '2,67 P. unter dem Fachschnitt',
      }),
    ).toBeNull();
  });
});
