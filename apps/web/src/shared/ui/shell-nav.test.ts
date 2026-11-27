import { describe, expect, it } from 'bun:test';
import { isPageOpen, isPagePending } from './shell-nav.ts';

describe('isPageOpen', () => {
  it('zählt eine Leistung zur Seite Noten', () => {
    expect(isPageOpen('/noten', '/noten')).toBe(true);
    expect(isPageOpen('/noten/k-1', '/noten')).toBe(true);
  });

  it('verwechselt keine Seite mit einer, die nur gleich beginnt', () => {
    expect(isPageOpen('/notenspiegel', '/noten')).toBe(false);
    expect(isPageOpen('/zeugnis', '/noten')).toBe(false);
  });

  it('hält die Übersicht nur auf ihrer eigenen Adresse für offen', () => {
    expect(isPageOpen('/', '/')).toBe(true);
    expect(isPageOpen('/noten', '/')).toBe(false);
  });
});

describe('isPagePending', () => {
  it('meldet die Seite, die unterwegs ist', () => {
    expect(isPagePending('/noten', '/zeugnis', '/zeugnis')).toBe(true);
    expect(isPagePending('/noten', '/zeugnis', '/faecher')).toBe(false);
  });

  it('meldet nichts, solange keine Seite unterwegs ist', () => {
    expect(isPagePending('/noten', null, '/zeugnis')).toBe(false);
  });

  it('meldet die Seite nicht, die schon offen ist', () => {
    expect(isPagePending('/noten', '/noten/k-1', '/noten')).toBe(false);
  });
});
