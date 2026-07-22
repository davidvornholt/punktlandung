import { describe, expect, it } from 'bun:test';

import { bestimmeAbfrageZustand } from './abfrage-zustand-modell.ts';

const istLeer = (werte: ReadonlyArray<unknown>) => werte.length === 0;

describe('bestimmeAbfrageZustand', () => {
  it('hält ausstehend, fehlgeschlagen, leer und erfolgreich auseinander', () => {
    expect(
      bestimmeAbfrageZustand({
        data: undefined,
        isError: false,
        isPending: true,
        istLeer,
      }),
    ).toBe('ausstehend');
    expect(
      bestimmeAbfrageZustand({
        data: undefined,
        isError: true,
        isPending: false,
        istLeer,
      }),
    ).toBe('fehler');
    expect(
      bestimmeAbfrageZustand({
        data: [],
        isError: false,
        isPending: false,
        istLeer,
      }),
    ).toBe('leer');
    expect(
      bestimmeAbfrageZustand({
        data: ['wert'],
        isError: false,
        isPending: false,
        istLeer,
      }),
    ).toBe('erfolg');
  });

  it('zeigt während einer initialen fehlgeschlagenen Anfrage den Fehler', () => {
    expect(
      bestimmeAbfrageZustand({
        data: undefined,
        isError: true,
        isPending: false,
        istLeer,
      }),
    ).not.toBe('leer');
  });
});
