import { describe, expect, it } from 'bun:test';

import { calculateLearningStatistics } from './learning-statistics.ts';

describe('berechneLernStatistik', () => {
  it('zählt eindeutige Lerntage im laufenden Monat', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-01', '2026-07-15', '2026-06-30'],
      '2026-07-22',
    );
    expect(statistics.daysThisMonth).toBe(2);
  });

  it('zählt die Serie rückwärts ab heute', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-22', '2026-07-21', '2026-07-20', '2026-07-18'],
      '2026-07-22',
    );
    expect(statistics.series).toBe(3);
  });

  it('lässt die Serie offen, wenn heute noch kein Eintrag existiert', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-21', '2026-07-20'],
      '2026-07-22',
    );
    expect(statistics.series).toBe(2);
  });

  it('zählt über Monatsgrenzen hinweg', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-01', '2026-06-30'],
      '2026-07-01',
    );
    expect(statistics.series).toBe(2);
    expect(statistics.daysThisMonth).toBe(1);
  });

  it('liefert null-Werte ohne Lerntage', () => {
    expect(calculateLearningStatistics([], '2026-07-22')).toEqual({
      daysThisMonth: 0,
      series: 0,
    });
  });
});
