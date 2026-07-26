import { describe, expect, it } from 'bun:test';

import { conversionTable } from './conversion-table.ts';
import { toSechser } from './notenwert.ts';
import { formatNote } from './zeugnisnote.ts';

const rowByTendenzLabel = (label: string) =>
  conversionTable.find((row) => row.tendenzLabel === label);

describe('conversionTable', () => {
  it('deckt jede Viertelnote von 1+ bis 6 ab', () => {
    expect(conversionTable.at(0)?.noteLabel).toBe('0,75');
    expect(conversionTable.at(-1)?.noteLabel).toBe('6');
    expect(conversionTable.map((row) => row.tendenzLabel)).toEqual([
      '1+',
      '1',
      '1-',
      '1-2',
      '2+',
      '2',
      '2-',
      '2-3',
      '3+',
      '3',
      '3-',
      '3-4',
      '4+',
      '4',
      '4-',
      '4-5',
      '5+',
      '5',
      '5-',
      '5-6',
      '6+',
      '6',
    ]);
  });

  it('vergibt für jede amtliche Tendenz ganze Notenpunkte', () => {
    const tendenzen = conversionTable.filter((row) => row.tendenz);
    expect(tendenzen).toHaveLength(16);
    for (const row of tendenzen) {
      expect(Number.isInteger(row.notenpunkte)).toBe(true);
    }
    expect(rowByTendenzLabel('1+')?.notenpunkte).toBe(15);
    expect(rowByTendenzLabel('2+')?.notenpunkte).toBe(12);
    expect(rowByTendenzLabel('6')?.notenpunkte).toBe(0);
  });

  it('markiert die Zwischennoten als interpoliert und legt sie mittig', () => {
    const zwischennote = rowByTendenzLabel('1-2');
    expect(zwischennote?.tendenz).toBe(false);
    expect(zwischennote?.notenpunkte).toBe(12.5);
    expect(rowByTendenzLabel('3-4')?.notenpunkte).toBe(6.5);
    expect(rowByTendenzLabel('2-3')?.tendenz).toBe(false);
  });

  it('fällt in den Punkten, während die Note schlechter wird', () => {
    for (let index = 1; index < conversionTable.length; index += 1) {
      const previous = conversionTable[index - 1];
      const current = conversionTable[index];
      expect(current?.note).toBeGreaterThan(previous?.note ?? Number.NaN);
      expect(current?.notenpunkte).toBeLessThan(
        previous?.notenpunkte ?? Number.NaN,
      );
    }
  });

  it('beschriftet die Punkte mit der Einheit', () => {
    expect(rowByTendenzLabel('1')?.notenpunkteLabel).toBe('14 P.');
    expect(rowByTendenzLabel('1-2')?.notenpunkteLabel).toBe('12,5 P.');
  });

  it.each([
    { notenpunkte: 15, tendenzLabel: '1+' },
    { notenpunkte: 13, tendenzLabel: '1-' },
    { notenpunkte: 12.5, tendenzLabel: '1-2' },
  ])('macht den Übersichtswert für $notenpunkte Notenpunkte auffindbar', ({
    notenpunkte,
    tendenzLabel,
  }) => {
    const overviewLabel = formatNote(toSechser(notenpunkte), 'sechser');
    const row = conversionTable.find(
      (candidate) => candidate.notenpunkte === notenpunkte,
    );

    expect(row?.noteLabel).toBe(overviewLabel);
    expect(row?.tendenzLabel).toBe(tendenzLabel);
  });
});
