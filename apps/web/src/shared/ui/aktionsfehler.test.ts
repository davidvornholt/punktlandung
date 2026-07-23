import { describe, expect, it } from 'bun:test';

import { aktionsfehlerText } from './aktionsfehler.ts';

describe('aktionsfehlerText', () => {
  it('erhält eine konkrete fachliche Validierungsmeldung', () => {
    expect(
      aktionsfehlerText(
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
      aktionsfehlerText(
        new TypeError('fetch failed'),
        'Die Verbindung ist fehlgeschlagen. Prüfe sie und versuche es erneut.',
      ),
    ).toBe(
      'Die Verbindung ist fehlgeschlagen. Prüfe sie und versuche es erneut.',
    );
  });
});
