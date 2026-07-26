import { describe, expect, it } from 'bun:test';

import { currentHalbjahr } from './current-halbjahr.ts';

const halbjahre = [
  { id: 'newer', startsOn: '2027-02-01', endsOn: '2027-07-28' },
  { id: 'older', startsOn: '2026-09-14', endsOn: '2027-01-29' },
] as const;

describe('currentHalbjahr', () => {
  it('wählt das Halbjahr, in dem heute liegt', () => {
    expect(currentHalbjahr(halbjahre, '2026-11-03')?.id).toBe('older');
    expect(currentHalbjahr(halbjahre, '2027-03-01')?.id).toBe('newer');
  });

  it('wählt in einer Lücke das zuletzt begonnene statt des künftigen', () => {
    expect(currentHalbjahr(halbjahre, '2027-01-30')?.id).toBe('older');
  });

  it('fällt nach allen Zeiträumen auf das zuletzt begonnene zurück', () => {
    expect(currentHalbjahr(halbjahre, '2027-08-15')?.id).toBe('newer');
  });

  it('liefert vor dem ersten Halbjahr null', () => {
    expect(currentHalbjahr(halbjahre, '2026-09-01')).toBeNull();
  });

  it('liefert null ohne Halbjahre', () => {
    expect(currentHalbjahr([], '2027-08-15')).toBeNull();
  });
});
