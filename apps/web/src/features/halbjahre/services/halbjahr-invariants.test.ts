import { describe, expect, it } from 'bun:test';

import {
  findHalbjahrViolation,
  findKlassenstufeMismatch,
} from './halbjahr-invariants.ts';

const previous = {
  schoolYear: '2026/27',
  system: 'sechser' as const,
  startsOn: '2026-09-01',
  endsOn: '2027-01-31',
};

describe('Halbjahr-Invarianten', () => {
  it('erlaubt einen Systemwechsel nur ohne Noten', () => {
    const notenpunkte = { ...previous, system: 'punkte' as const };
    expect(findHalbjahrViolation(previous, notenpunkte, [])).toBeNull();
    expect(findHalbjahrViolation(previous, notenpunkte, ['2026-10-01'])).toBe(
      'notensystem',
    );
  });

  it('erlaubt Erweiterungen und nur solche Schrumpfungen, die alle Noten enthalten', () => {
    const noten = ['2026-09-01', '2026-10-01', '2027-01-31'];
    expect(
      findHalbjahrViolation(
        previous,
        { ...previous, startsOn: '2026-08-01', endsOn: '2027-02-01' },
        noten,
      ),
    ).toBeNull();
    expect(
      findHalbjahrViolation(
        previous,
        { ...previous, startsOn: '2026-09-02' },
        noten,
      ),
    ).toBe('dateRange');
    expect(
      findHalbjahrViolation(
        previous,
        { ...previous, endsOn: '2027-01-30' },
        noten,
      ),
    ).toBe('dateRange');
  });
});

describe('Klassenstufe je Schuljahr', () => {
  const tenOne = {
    id: 'h1',
    schoolYear: '2026/27',
    half: 1 as const,
    klassenstufe: '10' as const,
  };
  const tenTwo = { ...tenOne, id: 'h2', half: 2 as const };

  it('lehnt ein neues oder ins Schuljahr verschobenes Halbjahr mit abweichender Klassenstufe ab', () => {
    expect(
      findKlassenstufeMismatch([tenOne], {
        ...tenTwo,
        id: null,
        klassenstufe: 'J1',
      }),
    ).toEqual({ kind: 'conflict', other: tenOne });
    const elsewhere = { ...tenTwo, schoolYear: '2025/26' };
    expect(
      findKlassenstufeMismatch([tenOne, elsewhere], {
        ...tenTwo,
        klassenstufe: '9',
      }),
    ).toEqual({ kind: 'conflict', other: tenOne });
  });

  it('korrigiert die Klassenstufe des ganzen Schuljahrs, wenn ein Halbjahr in seinem Schuljahr bleibt', () => {
    expect(
      findKlassenstufeMismatch([tenOne, tenTwo], {
        ...tenTwo,
        klassenstufe: '9',
      }),
    ).toEqual({ kind: 'correction', other: tenOne });
    expect(
      findKlassenstufeMismatch([tenOne, tenTwo], {
        ...tenOne,
        klassenstufe: 'J1',
      }),
    ).toEqual({ kind: 'correction', other: tenTwo });
  });

  it('lässt dieselbe Klassenstufe, andere Schuljahre und das Halbjahr selbst zu', () => {
    expect(
      findKlassenstufeMismatch([tenOne], { ...tenTwo, id: null }),
    ).toBeNull();
    expect(
      findKlassenstufeMismatch([tenOne], {
        ...tenTwo,
        id: null,
        schoolYear: '2027/28',
        klassenstufe: 'J1',
      }),
    ).toBeNull();
    expect(
      findKlassenstufeMismatch([tenOne], { ...tenOne, klassenstufe: '9' }),
    ).toBeNull();
  });

  it('überlässt eine doppelte Belegung derselben Halbjahresnummer der eigenen Meldung', () => {
    const duplicate = { ...tenOne, id: null, klassenstufe: 'J1' as const };
    expect(findKlassenstufeMismatch([tenOne], duplicate)).toBeNull();
    expect(findKlassenstufeMismatch([tenOne, tenTwo], duplicate)).toBeNull();
    expect(
      findKlassenstufeMismatch([tenOne, tenTwo], {
        ...tenTwo,
        half: 1,
        klassenstufe: 'J1',
      }),
    ).toBeNull();
  });
});
