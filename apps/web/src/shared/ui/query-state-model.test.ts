import { describe, expect, it } from 'bun:test';

import { determineQueryState } from './query-state-model.ts';

const isEmpty = (values: ReadonlyArray<unknown>) => values.length === 0;

describe('determineQueryState', () => {
  it('hält ausstehend, fehlgeschlagen, leer und erfolgreich auseinander', () => {
    expect(
      determineQueryState({
        data: undefined,
        isError: false,
        isPending: true,
        isEmpty,
      }),
    ).toBe('pending');
    expect(
      determineQueryState({
        data: undefined,
        isError: true,
        isPending: false,
        isEmpty,
      }),
    ).toBe('error');
    expect(
      determineQueryState({
        data: [],
        isError: false,
        isPending: false,
        isEmpty,
      }),
    ).toBe('empty');
    expect(
      determineQueryState({
        data: ['wert'],
        isError: false,
        isPending: false,
        isEmpty,
      }),
    ).toBe('success');
  });

  it('zeigt während einer initialen fehlgeschlagenen Anfrage den Fehler', () => {
    expect(
      determineQueryState({
        data: undefined,
        isError: true,
        isPending: false,
        isEmpty,
      }),
    ).not.toBe('empty');
  });
});
