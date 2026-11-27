import { describe, expect, it } from 'bun:test';
import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import { halbjahrDateRange } from '#/shared/school/school-year.ts';
import type { Stretch } from './halbjahr-look.ts';
import { candidateId, timeline } from './halbjahr-timeline-model.ts';

const today = '2026-11-26';

const stretch = (
  klassenstufe: Klassenstufe,
  half: 1 | 2,
  schoolYear: string,
): Stretch => ({
  ...halbjahrDateRange(schoolYear, half),
  half,
  id: `${klassenstufe}.${half}`,
  klassenstufe,
  schoolYear,
});

/** Klasse 9 bis J1.1, wie die Demo-Daten. */
const career = [
  stretch('9', 1, '2024/25'),
  stretch('9', 2, '2024/25'),
  stretch('10', 1, '2025/26'),
  stretch('10', 2, '2025/26'),
  stretch('J1', 1, '2026/27'),
];

/** Drei Schuljahre sind 1095 Tage: Auf dieser Breite ist ein Tag ein Pixel. */
const wide = 1097;

const laidOut = (
  input: Partial<Parameters<typeof timeline>[0]> = {},
): NonNullable<ReturnType<typeof timeline>> => {
  const result = timeline({
    candidate: null,
    halbjahre: career,
    today,
    width: wide,
    ...input,
  });
  if (result === null) {
    throw new Error('Expected a time line');
  }
  return result;
};

describe('timeline: Lage auf der Linie', () => {
  it('ist den Daten treu: gleich lange Zeiträume sind gleich breit und schließen aneinander an', () => {
    const { segments, width } = laidOut();
    const [first, second, third] = segments;
    expect(first?.x).toBe(1);
    expect(first?.width).toBe(184);
    expect(second?.x).toBe(185);
    expect(second?.width).toBe(181);
    expect(third?.x).toBe(366);
    expect(width).toBe(wide);
  });

  it('lässt das fehlende zweite Halbjahr als leere Strecke stehen', () => {
    const { segments, ticks } = laidOut();
    const last = segments.at(-1);
    expect((last?.x ?? 0) + (last?.width ?? 0)).toBe(915);
    expect(ticks.at(-1)).toEqual({ kind: 'year', x: 1096 });
  });

  it('setzt an jeden Monatsersten einen Strich und hebt die Halbjahresgrenzen hervor', () => {
    const { ticks } = laidOut();
    expect(ticks).toHaveLength(37);
    expect(ticks.filter((tick) => tick.kind === 'year')).toHaveLength(4);
    expect(ticks.filter((tick) => tick.kind === 'half')).toHaveLength(3);
  });

  it('zeigt heute an seiner Stelle im laufenden Halbjahr', () => {
    const { segments, today: mark } = laidOut();
    const current = segments.find((segment) => segment.look === 'current');
    expect(mark?.x).toBe(848);
    expect(mark?.x).toBeGreaterThan(current?.x ?? 0);
    expect(mark?.x).toBeLessThan((current?.x ?? 0) + (current?.width ?? 0));
  });

  it('nimmt das Schuljahr von heute dazu, wenn es an die Linie anschließt', () => {
    const afterSummer = laidOut({ today: '2027-09-15' });
    expect(afterSummer.today).not.toBeNull();
    expect(
      afterSummer.ticks.filter((tick) => tick.kind === 'year'),
    ).toHaveLength(5);
    const yearsLater = laidOut({ today: '2030-09-15' });
    expect(yearsLater.today).toBeNull();
    expect(
      yearsLater.ticks.filter((tick) => tick.kind === 'year'),
    ).toHaveLength(4);
  });
});

describe('timeline: Beschriftung', () => {
  it('klammert die Halbjahre eines Notensystems und nennt es', () => {
    const { brackets } = laidOut();
    expect(brackets.map((bracket) => bracket.caption?.text)).toEqual([
      'Noten 1–6',
      'Notenpunkte 0–15',
    ]);
    expect(brackets[0]?.from).toBe(1);
    expect(brackets[0]?.to).toBe(731);
    expect(brackets[1]?.from).toBe(731);
  });

  it('kürzt auf dem Telefon das Notensystem, statt es über den Rand zu schreiben', () => {
    const { brackets, names } = laidOut({ width: 358 });
    expect(brackets.map((bracket) => bracket.caption?.text)).toEqual([
      'Noten 1–6',
      '0–15 P.',
    ]);
    expect(names.map((name) => name.text).sort()).toEqual([
      '10.1',
      '10.2',
      '9.1',
      '9.2',
      'J1.1',
    ]);
  });

  it('lässt Namen weg, die sich berühren würden, und behält den des laufenden Halbjahrs', () => {
    const whole = [
      ...(['5', '6', '7', '8'] as const).flatMap((klassenstufe, index) => [
        stretch(klassenstufe, 1, `202${index}/2${index + 1}`),
        stretch(klassenstufe, 2, `202${index}/2${index + 1}`),
      ]),
      ...career,
    ];
    const { names, segments, ticks } = laidOut({
      halbjahre: whole,
      width: 358,
    });
    expect(segments).toHaveLength(13);
    // Sieben Schuljahre auf 358 Pixeln: Monatsstriche würden ineinanderlaufen.
    expect(ticks.map((tick) => tick.kind)).not.toContain('month');
    expect(names.length).toBeLessThan(segments.length);
    expect(names.map((name) => name.text)).toContain('J1.1');
    const sorted = [...names].sort((a, b) => a.x - b.x);
    const gaps = sorted
      .slice(1)
      .map((name, index) => name.x - (sorted[index]?.x ?? 0));
    expect(Math.min(...gaps)).toBeGreaterThan(20);
  });
});

describe('timeline: das Halbjahr aus dem Formular', () => {
  it('zeichnet ein neues Halbjahr aus dem Formular an seine Stelle', () => {
    const { brackets, segments, summary } = laidOut({
      candidate: { ...stretch('J1', 2, '2026/27'), replaces: null },
    });
    const candidate = segments.find((segment) => segment.id === candidateId);
    expect(candidate?.look).toBe('candidate');
    expect(candidate?.x).toBe(915);
    expect(candidate?.width).toBe(181);
    expect(segments).toHaveLength(6);
    expect(brackets[1]?.to).toBe(1096);
    expect(summary).toContain('Gestrichelt: J1.2');
  });

  it('ersetzt beim Ändern das gespeicherte Halbjahr durch das aus dem Formular', () => {
    const { brackets, segments } = laidOut({
      candidate: {
        ...stretch('J1', 1, '2026/27'),
        endsOn: '2027-02-05',
        klassenstufe: '10',
        replaces: 'J1.1',
      },
    });
    expect(segments.map((segment) => segment.id)).toEqual([
      '9.1',
      '9.2',
      '10.1',
      '10.2',
      candidateId,
    ]);
    expect(segments.at(-1)?.width).toBe(189);
    expect(brackets).toHaveLength(1);
  });

  it('sagt die Figur in Worten', () => {
    expect(laidOut().summary).toBe(
      'Zeitleiste der Halbjahre von August 2024 bis Juli 2027. 9.1, 9.2, 10.1, 10.2: Noten 1–6. J1.1: Notenpunkte 0–15. Aktuell ist J1.1.',
    );
  });

  it('hat ohne Halbjahr und ohne Formular nichts zu zeichnen', () => {
    expect(
      timeline({ candidate: null, halbjahre: [], today, width: wide }),
    ).toBeNull();
    expect(
      timeline({
        candidate: { ...stretch('J1', 1, '2026/27'), replaces: null },
        halbjahre: [],
        today,
        width: wide,
      })?.segments,
    ).toHaveLength(1);
  });
});
