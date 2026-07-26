import { describe, expect, it } from 'bun:test';

import { actionErrorText } from './action-error.ts';

describe('actionErrorText', () => {
  it('erhält eine konkrete fachliche Validierungsmeldung', () => {
    expect(
      actionErrorText(
        {
          _tag: 'NoteAusserhalbHalbjahr',
          message: 'Das Datum liegt außerhalb des Halbjahrs.',
        },
        'Speichern nicht möglich.',
      ),
    ).toBe('Das Datum liegt außerhalb des Halbjahrs.');
  });

  it('ersetzt unbekannte Laufzeitfehler durch eine handlungsorientierte Meldung', () => {
    expect(
      actionErrorText(
        new TypeError('fetch failed'),
        'Die Verbindung ist fehlgeschlagen. Prüfe sie und versuche es erneut.',
      ),
    ).toBe(
      'Die Verbindung ist fehlgeschlagen. Prüfe sie und versuche es erneut.',
    );
  });
});
