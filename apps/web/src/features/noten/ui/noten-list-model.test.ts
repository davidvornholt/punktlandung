import { describe, expect, it } from 'bun:test';

import type { NoteWithFach } from '../services/noten-service.ts';
import {
  closeIfSaved,
  isEditPending,
  noUpdateErrors,
  updateErrorText,
  withNote,
  withoutNote,
} from './noten-list-model.ts';

const noteA = { id: 'note-a' } as NoteWithFach;
const noteB = { id: 'note-b' } as NoteWithFach;

const failure = {
  _tag: 'HalbjahrGesperrt',
  message: 'Das Halbjahr ist gesperrt.',
};
const other = new Error('Verbindung weg');

describe('Fehler je Note', () => {
  /**
   * Die Liste teilt sich eine Änderungsmutation über alle Zeilen, und die trägt
   * nur ihren letzten Ausgang. Ohne die Kennung verschluckte das Speichern
   * einer zweiten Note den Fehler der ersten, und diese bliebe stillschweigend
   * ungeändert.
   */
  it('behält den Fehler einer Note, wenn eine zweite scheitert', () => {
    const known = withNote(noUpdateErrors, 'note-a', failure);

    const next = withNote(known, 'note-b', other);

    expect(next.get('note-a')).toBe(failure);
    expect(next.get('note-b')).toBe(other);
  });

  it('nimmt nur den Fehler der genannten Note zurück', () => {
    const known = withNote(
      withNote(noUpdateErrors, 'note-a', failure),
      'note-b',
      other,
    );

    const next = withoutNote(known, 'note-a');

    expect(next.has('note-a')).toBe(false);
    expect(next.get('note-b')).toBe(other);
  });

  it('lässt den bekannten Stand unverändert', () => {
    const known = withNote(noUpdateErrors, 'note-a', failure);

    withoutNote(known, 'note-a');
    withNote(known, 'note-b', other);

    expect([...known.keys()]).toEqual(['note-a']);
  });

  it('benennt einen Fehler und schweigt ohne einen', () => {
    expect(updateErrorText(failure)).toBe('Das Halbjahr ist gesperrt.');
    expect(updateErrorText(undefined)).toBe(null);
    expect(updateErrorText(other)).toContain('konnte nicht geändert werden');
  });
});

describe('closeIfSaved', () => {
  it('schließt die Bearbeitung der gespeicherten Note', () => {
    expect(closeIfSaved('note-a')(noteA)).toBe(null);
  });

  /**
   * Bis die Änderung durch ist, kann der Benutzer längst eine andere Note
   * geöffnet haben; die dürfte ihm der Nachlauf der ersten nicht zuklappen.
   */
  it('lässt eine inzwischen geöffnete andere Note offen', () => {
    expect(closeIfSaved('note-a')(noteB)).toBe(noteB);
    expect(closeIfSaved('note-a')(null)).toBe(null);
  });
});

describe('isEditPending', () => {
  it('meldet nur die gerade gespeicherte Note als beschäftigt', () => {
    const saving = { isPending: true, variables: { id: 'note-a' } };

    expect(isEditPending(saving, noteA)).toBe(true);
    expect(isEditPending(saving, noteB)).toBe(false);
    expect(isEditPending(saving, null)).toBe(false);
  });

  it('meldet nichts, solange nichts läuft', () => {
    expect(
      isEditPending({ isPending: false, variables: { id: 'note-a' } }, noteA),
    ).toBe(false);
  });
});
