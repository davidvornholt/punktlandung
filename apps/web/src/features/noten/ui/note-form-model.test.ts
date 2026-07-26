import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import type { NoteFormValues } from './note-form-model.ts';
import {
  emptyNoteFormValues,
  noteFieldsFromValues,
  noteFormValues,
} from './note-form-model.ts';

const blankValues: NoteFormValues = {
  subjectId: 'fach-1',
  kind: 'klausur',
  wert: '2',
  gewicht: '',
  datum: '2026-03-04',
  notiz: '',
};

const note: NoteWithFach = {
  id: 'note-1',
  kind: 'gfs',
  wert: 2.5,
  gewicht: 1.5,
  datum: '2026-02-11',
  notiz: 'Referat Photosynthese',
  fachId: 'fach-2',
  fachName: 'Biologie',
  fachKuerzel: 'BIO',
  gewichtung: standardgewichtung,
};

describe('noteFieldsFromValues', () => {
  it('liest ein Dezimalkomma wie einen Punkt', () => {
    const fields = noteFieldsFromValues({
      ...blankValues,
      wert: '2,5',
      gewicht: '1,25',
    });

    expect(fields.wert).toBe(2.5);
    expect(fields.gewicht).toBe(1.25);
  });

  it('wertet eine Note ohne Gewichtsangabe einfach', () => {
    expect(noteFieldsFromValues(blankValues).gewicht).toBe(1);
  });

  it('speichert eine leere Notiz als fehlend statt als leeren Text', () => {
    expect(noteFieldsFromValues({ ...blankValues, notiz: '  ' }).notiz).toBe(
      null,
    );
  });
});

describe('noteFormValues', () => {
  it('belegt das Formular beim Bearbeiten mit der bestehenden Note vor', () => {
    expect(noteFormValues(note)).toEqual({
      subjectId: 'fach-2',
      kind: 'gfs',
      wert: '2.5',
      gewicht: '1.5',
      datum: '2026-02-11',
      notiz: 'Referat Photosynthese',
    });
  });

  it('liefert jedes Feld als Text, wie das Formular es erwartet', () => {
    expect(
      Object.values(noteFormValues(note)).every(
        (value) => typeof value === 'string',
      ),
    ).toBe(true);
  });
});

describe('emptyNoteFormValues', () => {
  it('schlägt beim Neueintrag das übergebene Datum vor', () => {
    const values = emptyNoteFormValues('2026-07-26');

    expect(values.datum).toBe('2026-07-26');
    expect(values.wert).toBe('');
    expect(values.gewicht).toBe('1');
  });
});
