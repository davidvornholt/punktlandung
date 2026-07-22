import { describe, expect, it } from 'bun:test';

import {
  formatHalbnote,
  formatNote,
  halbjahresnote,
  jahresnote,
} from './zeugnisnote.ts';

describe('halbjahresnote', () => {
  it('sechser: rundet auf Viertelstufen', () => {
    expect(halbjahresnote(2.3, 'sechser')).toBe(2.25);
    expect(halbjahresnote(1.6, 'sechser')).toBe(1.5);
    expect(halbjahresnote(0.8, 'sechser')).toBe(1);
  });

  it('punkte: rundet auf ganze Notenpunkte und klemmt auf 0–15', () => {
    expect(halbjahresnote(10.6, 'punkte')).toBe(11);
    expect(halbjahresnote(15.4, 'punkte')).toBe(15);
  });
});

describe('jahresnote', () => {
  it('rundet auf ganze Noten', () => {
    expect(jahresnote(2.3)).toEqual({ note: 2, grenzfall: false });
    expect(jahresnote(2.7)).toEqual({ note: 3, grenzfall: false });
  });

  it('markiert ,5-Grenzfälle und rundet pessimistisch', () => {
    expect(jahresnote(2.5)).toEqual({ note: 3, grenzfall: true });
    expect(jahresnote(2.55)).toEqual({ note: 3, grenzfall: true });
  });
});

describe('formatHalbnote', () => {
  it('bildet Viertelstufen auf Zeugnisschreibweise ab', () => {
    expect(formatHalbnote(1)).toBe('1');
    expect(formatHalbnote(1.25)).toBe('1-');
    expect(formatHalbnote(1.5)).toBe('1-2');
    expect(formatHalbnote(1.75)).toBe('2+');
    expect(formatHalbnote(5.5)).toBe('5-6');
  });
});

describe('formatNote', () => {
  it('formatiert nativ mit Dezimalkomma bzw. Punkten', () => {
    expect(formatNote(2.25, 'sechser')).toBe('2,25');
    expect(formatNote(11, 'punkte')).toBe('11 P.');
  });
});
