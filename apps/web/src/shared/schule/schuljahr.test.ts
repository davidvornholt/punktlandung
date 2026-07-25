import { describe, expect, it } from 'bun:test';

import {
  halbjahrZeitraum,
  halbjahrZumDatum,
  naechstesSchuljahr,
  schuljahrAusBeginnjahr,
  schuljahrAuswahl,
  schuljahrZumDatum,
} from './schuljahr.ts';

describe('schuljahrAusBeginnjahr', () => {
  it('kürzt das Folgejahr zweistellig', () => {
    expect(schuljahrAusBeginnjahr(2026)).toBe('2026/27');
  });

  it('füllt den Jahrhundertwechsel auf zwei Stellen auf', () => {
    expect(schuljahrAusBeginnjahr(2099)).toBe('2099/00');
  });
});

describe('schuljahrZumDatum', () => {
  it('ordnet den 1. August dem beginnenden Schuljahr zu', () => {
    expect(schuljahrZumDatum('2026-08-01')).toBe('2026/27');
  });

  it('ordnet den 31. Juli noch dem laufenden Schuljahr zu', () => {
    expect(schuljahrZumDatum('2026-07-31')).toBe('2025/26');
  });

  it('ordnet den Januar dem im Vorjahr begonnenen Schuljahr zu', () => {
    expect(schuljahrZumDatum('2027-01-31')).toBe('2026/27');
  });
});

describe('halbjahrZumDatum', () => {
  it('zählt August bis Januar zum ersten Halbjahr', () => {
    expect(halbjahrZumDatum('2026-08-01')).toBe(1);
    expect(halbjahrZumDatum('2027-01-31')).toBe(1);
  });

  it('zählt Februar bis Juli zum zweiten Halbjahr', () => {
    expect(halbjahrZumDatum('2027-02-01')).toBe(2);
    expect(halbjahrZumDatum('2027-07-31')).toBe(2);
  });
});

describe('halbjahrZeitraum', () => {
  it('nutzt die amtlichen Grenzen des ersten Halbjahrs', () => {
    expect(halbjahrZeitraum('2026/27', 1)).toEqual({
      startsOn: '2026-08-01',
      endsOn: '2027-01-31',
    });
  });

  it('nutzt die amtlichen Grenzen des zweiten Halbjahrs', () => {
    expect(halbjahrZeitraum('2026/27', 2)).toEqual({
      startsOn: '2027-02-01',
      endsOn: '2027-07-31',
    });
  });

  it('deckt das Schuljahr lückenlos und überschneidungsfrei ab', () => {
    const erstes = halbjahrZeitraum('2026/27', 1);
    const zweites = halbjahrZeitraum('2026/27', 2);
    const folgejahr = halbjahrZeitraum('2027/28', 1);

    expect(erstes.endsOn < zweites.startsOn).toBe(true);
    expect(zweites.endsOn < folgejahr.startsOn).toBe(true);
    expect(halbjahrZumDatum(zweites.startsOn)).toBe(2);
    expect(schuljahrZumDatum(zweites.endsOn)).toBe('2026/27');
  });
});

describe('naechstesSchuljahr', () => {
  it('zählt das Beginnjahr hoch', () => {
    expect(naechstesSchuljahr('2026/27')).toBe('2027/28');
  });
});

describe('schuljahrAuswahl', () => {
  it('reicht vom kommenden Schuljahr zurück und sortiert absteigend', () => {
    const auswahl = schuljahrAuswahl('2026-09-01', []);

    expect(auswahl[0]).toBe('2027/28');
    expect(auswahl.at(-1)).toBe('2022/23');
    expect([...auswahl].sort().reverse()).toEqual([...auswahl]);
  });

  it('ergänzt erfasste Schuljahre außerhalb des Fensters ohne Dubletten', () => {
    const auswahl = schuljahrAuswahl('2026-09-01', ['2019/20', '2026/27']);

    expect(auswahl).toContain('2019/20');
    expect(auswahl.filter((eintrag) => eintrag === '2026/27')).toHaveLength(1);
  });
});
