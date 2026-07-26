import { describe, expect, it } from 'bun:test';

import type { NoteMitFach } from '../services/noten-service.ts';
import type { NoteEingaben } from './note-form-modell.ts';
import {
  leereNoteEingaben,
  noteEingaben,
  noteFelderAusEingaben,
} from './note-form-modell.ts';

const leereEingaben: NoteEingaben = {
  subjectId: 'fach-1',
  kind: 'klausur',
  area: '',
  wert: '2',
  gewicht: '',
  datum: '2026-03-04',
  notiz: '',
};

const note: NoteMitFach = {
  id: 'note-1',
  kind: 'gfs',
  area: 'muendlich',
  wert: 2.5,
  gewicht: 1.5,
  datum: '2026-02-11',
  notiz: 'Referat Photosynthese',
  fachId: 'fach-2',
  fachName: 'Biologie',
  fachKuerzel: 'BIO',
  gewichtung: {
    writtenShare: null,
    kindWeights: {
      klausur: 1,
      test: 1,
      muendlich: 1,
      gfs: 1,
      sonstige: 1,
    },
  },
};

describe('noteFelderAusEingaben', () => {
  it('liest ein Dezimalkomma wie einen Punkt', () => {
    const felder = noteFelderAusEingaben({
      ...leereEingaben,
      wert: '2,5',
      gewicht: '1,25',
    });

    expect(felder.wert).toBe(2.5);
    expect(felder.gewicht).toBe(1.25);
  });

  it('wertet eine Note ohne Gewichtsangabe einfach', () => {
    expect(noteFelderAusEingaben(leereEingaben).gewicht).toBe(1);
  });

  it('lässt den Bereich weg, damit der Service ihn aus der Art ableitet', () => {
    expect(noteFelderAusEingaben(leereEingaben)).not.toHaveProperty('area');
  });

  it('übernimmt einen ausdrücklich gewählten Bereich', () => {
    expect(
      noteFelderAusEingaben({ ...leereEingaben, area: 'muendlich' }).area,
    ).toBe('muendlich');
  });

  it('speichert eine leere Notiz als fehlend statt als leeren Text', () => {
    expect(noteFelderAusEingaben({ ...leereEingaben, notiz: '  ' }).notiz).toBe(
      null,
    );
  });
});

describe('noteEingaben', () => {
  it('belegt das Formular beim Bearbeiten mit der bestehenden Note vor', () => {
    expect(noteEingaben(note)).toEqual({
      subjectId: 'fach-2',
      kind: 'gfs',
      area: 'muendlich',
      wert: '2.5',
      gewicht: '1.5',
      datum: '2026-02-11',
      notiz: 'Referat Photosynthese',
    });
  });

  it('behält einen Bereich, der vom Standard der Art abweicht', () => {
    expect(noteEingaben(note).area).toBe('muendlich');
  });

  it('gibt einen aus der Art abgeleiteten Bereich wieder frei', () => {
    const felder = noteEingaben({
      ...note,
      kind: 'klausur',
      area: 'schriftlich',
    });

    expect(felder.area).toBe('');
  });

  it('liefert jedes Feld als Text, wie das Formular es erwartet', () => {
    expect(
      Object.values(noteEingaben(note)).every(
        (wert) => typeof wert === 'string',
      ),
    ).toBe(true);
  });
});

describe('leereNoteEingaben', () => {
  it('schlägt beim Neueintrag das übergebene Datum vor', () => {
    const werte = leereNoteEingaben('2026-07-26');

    expect(werte.datum).toBe('2026-07-26');
    expect(werte.wert).toBe('');
    expect(werte.gewicht).toBe('1');
  });
});
