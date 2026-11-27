import { describe, expect, it } from 'bun:test';
import { halbjahrPlaces, placeAtAge } from './halbjahr-strata.ts';

/** Klasse 8 bis J1.2, absichtlich nicht nach Beginn geordnet. */
const halbjahre = [
  { id: 'j1.2', startsOn: '2027-02-01' },
  { id: '8.1', startsOn: '2023-09-11' },
  { id: '9.1', startsOn: '2024-09-09' },
  { id: '8.2', startsOn: '2024-02-01' },
  { id: '10.1', startsOn: '2025-09-15' },
  { id: '9.2', startsOn: '2025-02-01' },
  { id: 'j1.1', startsOn: '2026-09-14' },
  { id: '10.2', startsOn: '2026-02-01' },
];

describe('placeAtAge', () => {
  it('lässt ältere Halbjahre vom kräftigsten zum blassesten Ton verblassen', () => {
    expect([1, 2, 3, 4].map(placeAtAge)).toEqual([3, 2, 1, 0]);
  });

  it('hält alles, was noch weiter zurückliegt, im blassesten Ton', () => {
    expect([5, 6, 40].map(placeAtAge)).toEqual([0, 0, 0]);
  });

  it('trennt das laufende Halbjahr von denen, die noch kommen', () => {
    expect(placeAtAge(0)).toBe('current');
    expect([-1, -3].map(placeAtAge)).toEqual(['future', 'future']);
  });
});

describe('halbjahrPlaces', () => {
  it('zählt die Halbjahre in der Reihenfolge, in der sie beginnen', () => {
    const places = halbjahrPlaces(halbjahre, 'j1.1');
    expect(
      ['8.1', '8.2', '9.1', '9.2', '10.1', '10.2', 'j1.1', 'j1.2'].map((id) =>
        places.get(id),
      ),
    ).toEqual([0, 0, 0, 1, 2, 3, 'current', 'future']);
  });

  it('kennt ohne laufendes Halbjahr nur künftige', () => {
    for (const currentId of [null, 'gibt-es-nicht']) {
      expect(new Set(halbjahrPlaces(halbjahre, currentId).values())).toEqual(
        new Set(['future']),
      );
    }
  });
});
