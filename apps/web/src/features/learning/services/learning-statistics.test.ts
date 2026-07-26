import { describe, expect, it } from 'bun:test';

import { calculateLearningStatistics } from './learning-statistics.ts';

describe('calculateLearningStatistics', () => {
  it('zählt eindeutige Lerntage im laufenden Monat', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-01', '2026-07-15', '2026-06-30'],
      '2026-07-22',
    );
    expect(statistics.tageDiesenMonat).toBe(2);
  });

  it('zählt die Serie rückwärts ab heute', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-22', '2026-07-21', '2026-07-20', '2026-07-18'],
      '2026-07-22',
    );
    expect(statistics.serie).toBe(3);
  });

  it('lässt die Serie offen, wenn heute noch kein Eintrag existiert', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-21', '2026-07-20'],
      '2026-07-22',
    );
    expect(statistics.serie).toBe(2);
  });

  it('zählt über Monatsgrenzen hinweg', () => {
    const statistics = calculateLearningStatistics(
      ['2026-07-01', '2026-06-30'],
      '2026-07-01',
    );
    expect(statistics.serie).toBe(2);
    expect(statistics.tageDiesenMonat).toBe(1);
  });

  it('liefert null-Werte ohne Lerntage', () => {
    expect(calculateLearningStatistics([], '2026-07-22')).toEqual({
      tageDiesenMonat: 0,
      serie: 0,
    });
  });
});
