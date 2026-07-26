import { describe, expect, it } from 'bun:test';

import type { Halbjahr } from '../services/halbjahr-service.ts';
import {
  halbjahrFormValues,
  isOccupied,
  newHalbjahrSuggestion,
  occupiedHalbjahre,
  toHalbjahrInput,
  withUpdatedDateRange,
} from './halbjahr-form-model.ts';

const tenOne: Halbjahr = {
  id: 'A',
  klassenstufe: '10',
  schoolYear: '2025/26',
  number: 1,
  notensystem: 'sechser',
  startsOn: '2025-08-01',
  endsOn: '2026-01-31',
};
const tenTwo: Halbjahr = {
  id: 'B',
  klassenstufe: '10',
  schoolYear: '2025/26',
  number: 2,
  notensystem: 'sechser',
  startsOn: '2026-02-01',
  endsOn: '2026-07-31',
};

describe('neuesHalbjahrVorschlag', () => {
  it('schlägt ohne Bestand das heute laufende Halbjahr vor', () => {
    const suggestion = newHalbjahrSuggestion([], '2026-09-15');

    expect(suggestion.schoolYear).toBe('2026/27');
    expect(suggestion.number).toBe(1);
    expect(suggestion.startsOn).toBe('2026-08-01');
    expect(suggestion.endsOn).toBe('2027-01-31');
  });

  it('folgt auf ein erstes Halbjahr im selben Schuljahr das zweite', () => {
    const suggestion = newHalbjahrSuggestion([tenOne], '2025-10-01');

    expect(suggestion).toMatchObject({
      klassenstufe: '10',
      schoolYear: '2025/26',
      number: 2,
      startsOn: '2026-02-01',
      endsOn: '2026-07-31',
    });
  });

  it('rückt nach einem zweiten Halbjahr in Schuljahr und Klassenstufe vor', () => {
    const suggestion = newHalbjahrSuggestion([tenOne, tenTwo], '2026-07-25');

    expect(suggestion).toMatchObject({
      klassenstufe: 'J1',
      schoolYear: '2026/27',
      number: 1,
      startsOn: '2026-08-01',
      endsOn: '2027-01-31',
    });
  });

  it('richtet sich nach dem zuletzt begonnenen, nicht dem ersten Eintrag', () => {
    expect(newHalbjahrSuggestion([tenTwo, tenOne], '2026-07-25')).toEqual(
      newHalbjahrSuggestion([tenOne, tenTwo], '2026-07-25'),
    );
  });

  it('bleibt nach J2 auf J2 stehen', () => {
    const j2: Halbjahr = {
      ...tenTwo,
      id: 'C',
      klassenstufe: 'J2',
      schoolYear: '2027/28',
      notensystem: 'punkte',
      startsOn: '2028-02-01',
      endsOn: '2028-07-31',
    };

    expect(newHalbjahrSuggestion([j2], '2028-08-01').klassenstufe).toBe('J2');
  });
});

describe('halbjahrFormWerte', () => {
  it('übernimmt beim Bearbeiten den gespeicherten Stand', () => {
    const values = halbjahrFormValues(tenOne, [tenOne], '2026-07-25');

    expect(values).toEqual({
      klassenstufe: '10',
      schoolYear: '2025/26',
      number: 1,
      startsOn: '2025-08-01',
      endsOn: '2026-01-31',
      dateRangeAdjusted: false,
    });
  });

  it('erkennt einen vom amtlichen Zeitraum abweichenden Bestand', () => {
    const values = halbjahrFormValues(
      { ...tenOne, startsOn: '2025-09-11' },
      [tenOne],
      '2026-07-25',
    );

    expect(values.dateRangeAdjusted).toBe(true);
    expect(values.startsOn).toBe('2025-09-11');
  });
});

describe('mitAktualisiertemZeitraum', () => {
  it('zieht den Zeitraum bei einem Halbjahreswechsel nach', () => {
    const values = withUpdatedDateRange({
      ...halbjahrFormValues(tenOne, [], '2026-07-25'),
      number: 2,
    });

    expect(values.startsOn).toBe('2026-02-01');
    expect(values.endsOn).toBe('2026-07-31');
  });

  it('lässt einen angepassten Zeitraum unangetastet', () => {
    const values = withUpdatedDateRange({
      klassenstufe: '10',
      schoolYear: '2025/26',
      number: 2,
      startsOn: '2026-02-15',
      endsOn: '2026-06-30',
      dateRangeAdjusted: true,
    });

    expect(values.startsOn).toBe('2026-02-15');
    expect(values.endsOn).toBe('2026-06-30');
  });
});

describe('toHalbjahrInput', () => {
  it('sendet nur die erfassten Felder; das Notensystem leitet der Server ab', () => {
    const values = halbjahrFormValues(tenOne, [], '2026-07-25');

    expect(toHalbjahrInput({ ...values, klassenstufe: 'J1' })).toEqual({
      klassenstufe: 'J1',
      schoolYear: '2025/26',
      number: 1,
      startsOn: '2025-08-01',
      endsOn: '2026-01-31',
    });
  });
});

describe('belegteHalbjahre', () => {
  it('meldet vergebene Kombinationen aus Schuljahr und Halbjahr', () => {
    const occupied = occupiedHalbjahre([tenOne, tenTwo], null);

    expect(isOccupied(occupied, '2025/26', 1)).toBe(true);
    expect(isOccupied(occupied, '2026/27', 1)).toBe(false);
  });

  it('nimmt das gerade bearbeitete Halbjahr aus', () => {
    const occupied = occupiedHalbjahre([tenOne, tenTwo], tenOne);

    expect(isOccupied(occupied, '2025/26', 1)).toBe(false);
    expect(isOccupied(occupied, '2025/26', 2)).toBe(true);
  });
});
