import { describe, expect, it } from 'bun:test';

import { isFachSelectable, isValueValid } from './noten-validation.ts';

describe('isFachSelectable', () => {
  const listed = { id: 'biologie', archived: false };
  const archived = { id: 'latein', archived: true };

  it('lehnt ein Fach ab, das nicht zum Schuljahr gehört', () => {
    expect(isFachSelectable(undefined, null)).toBe(false);
    expect(isFachSelectable(undefined, 'latein')).toBe(false);
  });

  it('erlaubt jedes geführte Fach', () => {
    expect(isFachSelectable(listed, null)).toBe(true);
    expect(isFachSelectable(listed, 'latein')).toBe(true);
  });

  it('lässt eine Note an ihrem archivierten Fach korrigierbar', () => {
    expect(isFachSelectable(archived, 'latein')).toBe(true);
  });

  it('lässt keine Note in ein archiviertes Fach umziehen', () => {
    expect(isFachSelectable(archived, null)).toBe(false);
    expect(isFachSelectable(archived, 'biologie')).toBe(false);
  });
});

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
