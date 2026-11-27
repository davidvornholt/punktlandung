import { describe, expect, it } from 'bun:test';
import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import { halbjahrDateRange } from '#/shared/school/school-year.ts';
import { halbjahrLooks, type Stretch } from './halbjahr-look.ts';

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

describe('halbjahrLooks', () => {
  it('färbt das laufende Halbjahr rot und lässt ältere verblassen', () => {
    const looks = halbjahrLooks(career, today);
    expect([...career.map((halbjahr) => looks.get(halbjahr.id))]).toEqual([
      'stratum0',
      'stratum1',
      'stratum2',
      'stratum3',
      'current',
    ]);
  });

  it('zeichnet ein Halbjahr, das noch nicht begonnen hat, als künftig', () => {
    const looks = halbjahrLooks(
      [...career, stretch('J1', 2, '2026/27')],
      today,
    );
    expect(looks.get('J1.2')).toBe('future');
    expect(looks.get('J1.1')).toBe('current');
  });

  it('hält alles, was mehr als vier Halbjahre zurückliegt, im blassesten Ton', () => {
    const looks = halbjahrLooks(
      [stretch('8', 1, '2023/24'), stretch('8', 2, '2023/24'), ...career],
      today,
    );
    expect(looks.get('8.1')).toBe('stratum0');
    expect(looks.get('8.2')).toBe('stratum0');
    expect(looks.get('9.1')).toBe('stratum0');
    expect(looks.get('9.2')).toBe('stratum1');
  });

  it('nimmt nach dem Ende des letzten Halbjahrs das zuletzt begonnene als laufend', () => {
    expect(halbjahrLooks(career, '2027-08-20').get('J1.1')).toBe('current');
  });

  it('kennt ohne begonnenes Halbjahr nur künftige', () => {
    const looks = halbjahrLooks(career, '2024-07-01');
    expect(new Set(looks.values())).toEqual(new Set(['future']));
  });
});
