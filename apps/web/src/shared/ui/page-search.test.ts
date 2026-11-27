import { describe, expect, it } from 'bun:test';
import {
  parseHalbjahrSearch,
  parseLeistungSearch,
  parseNotenSearch,
} from './page-search.ts';

describe('parseNotenSearch', () => {
  it('behält, was es kennt', () => {
    expect(parseNotenSearch({ halbjahr: 'h1', fach: 'f1', neu: true })).toEqual(
      { halbjahr: 'h1', fach: 'f1', neu: true },
    );
    expect(parseNotenSearch({ neu: 'true' })).toEqual({ neu: true });
  });

  it('lässt Unbekanntes und Leeres weg', () => {
    expect(
      parseNotenSearch({ halbjahr: '', fach: 7, neu: 'ja', mehr: 'x' }),
    ).toEqual({});
  });
});

describe('parseLeistungSearch', () => {
  it('kennt nur das Eintragen', () => {
    expect(parseLeistungSearch({ eintragen: true })).toEqual({
      eintragen: true,
    });
    expect(parseLeistungSearch({ eintragen: false, neu: true })).toEqual({});
  });
});

describe('parseHalbjahrSearch', () => {
  it('behält das Halbjahr', () => {
    expect(parseHalbjahrSearch({ halbjahr: 'h2', fach: 'f1' })).toEqual({
      halbjahr: 'h2',
    });
  });
});
