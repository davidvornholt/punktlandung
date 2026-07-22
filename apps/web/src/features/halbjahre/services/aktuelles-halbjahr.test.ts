import { describe, expect, it } from 'bun:test';

import { aktuellesHalbjahr } from './aktuelles-halbjahr.ts';

const halbjahre = [
  { id: 'neu', startsOn: '2027-02-01', endsOn: '2027-07-28' },
  { id: 'alt', startsOn: '2026-09-14', endsOn: '2027-01-29' },
] as const;

describe('aktuellesHalbjahr', () => {
  it('wählt das Halbjahr, in dem heute liegt', () => {
    expect(aktuellesHalbjahr(halbjahre, '2026-11-03')?.id).toBe('alt');
    expect(aktuellesHalbjahr(halbjahre, '2027-03-01')?.id).toBe('neu');
  });

  it('fällt außerhalb aller Zeiträume auf das zuletzt begonnene zurück', () => {
    expect(aktuellesHalbjahr(halbjahre, '2027-08-15')?.id).toBe('neu');
  });

  it('liefert null ohne Halbjahre', () => {
    expect(aktuellesHalbjahr([], '2027-08-15')).toBeNull();
  });
});
