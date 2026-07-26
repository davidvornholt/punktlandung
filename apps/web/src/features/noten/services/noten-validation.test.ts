import { describe, expect, it } from 'bun:test';

import { isValueValid } from './noten-validation.ts';

describe('isValueValid', () => {
  it('sechser: erlaubt 1,00 bis 6,00 einschließlich Zwischenwerten', () => {
    expect(isValueValid(1, 'sechser')).toBe(true);
    expect(isValueValid(2.75, 'sechser')).toBe(true);
    expect(isValueValid(6, 'sechser')).toBe(true);
    expect(isValueValid(0.75, 'sechser')).toBe(false);
    expect(isValueValid(6.25, 'sechser')).toBe(false);
  });

  it('punkte: erlaubt nur ganze Zahlen von 0 bis 15', () => {
    expect(isValueValid(0, 'punkte')).toBe(true);
    expect(isValueValid(15, 'punkte')).toBe(true);
    expect(isValueValid(10.5, 'punkte')).toBe(false);
    expect(isValueValid(16, 'punkte')).toBe(false);
  });
});
