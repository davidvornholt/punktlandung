import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import { scaleFor } from '#/shared/ui/ruler/scale.ts';
import type { Leistung } from '../services/noten-service.ts';
import {
  canSubmit,
  draftOf,
  type EntryDraft,
  entryMode,
  entryTitle,
  fieldsOf,
  figureText,
  gewichtText,
  kindHint,
  nudge,
  stepGewicht,
  submitLabel,
} from './note-entry-model.ts';

const today = '2026-11-26';

const halbe: Fachgewichtung = {
  ...standardgewichtung,
  verhaeltnis: { schriftlich: 1, muendlich: 1 },
};

const graded = (
  id: string,
  wert: number,
  rest: Partial<Leistung> = {},
): Leistung => ({
  datum: '2026-10-05',
  fachId: 'physik',
  fachKuerzel: 'Ph',
  fachName: 'Physik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur',
  notiz: null,
  ...rest,
  status: 'graded',
  wert,
});

const planned = (id: string, rest: Partial<Leistung> = {}): Leistung => ({
  datum: '2026-12-10',
  fachId: 'physik',
  fachKuerzel: 'Ph',
  fachName: 'Physik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur',
  notiz: null,
  ...rest,
  status: 'planned',
});

const draft = (rest: Partial<EntryDraft> = {}): EntryDraft => ({
  kind: 'klausur',
  wert: null,
  gewicht: 1,
  datum: today,
  notiz: '',
  ...rest,
});

describe('womit ein Eintrag beginnt', () => {
  it('beginnt eine neue Note als leere Klausur am vorgegebenen Tag', () => {
    expect(draftOf(null, today)).toEqual({
      kind: 'klausur',
      wert: null,
      gewicht: 1,
      datum: today,
      notiz: '',
    });
  });

  it('übernimmt die Werte der Leistung, die geändert wird', () => {
    const test = graded('a', 11, {
      kind: 'test',
      gewicht: 2,
      notiz: 'Optik',
    });

    expect(draftOf(test, today)).toEqual({
      kind: 'test',
      wert: 11,
      gewicht: 2,
      datum: '2026-10-05',
      notiz: 'Optik',
    });
  });

  it('lässt die Note einer geplanten Leistung offen', () => {
    expect(draftOf(planned('a'), today).wert).toBe(null);
    expect(draftOf(planned('a'), today).datum).toBe('2026-12-10');
  });

  it('unterscheidet neu, eintragen und ändern', () => {
    expect(entryMode(null)).toBe('new');
    expect(entryMode(planned('a'))).toBe('grade');
    expect(entryMode(graded('a', 10))).toBe('change');
  });
});

describe('wie ein Eintrag heißt', () => {
  it('nennt das Fach, die Leistung oder die Änderung', () => {
    expect(entryTitle(null, 'Physik')).toBe('Neue Note in Physik');
    expect(entryTitle(planned('a'), 'Physik')).toBe(
      'Note für die Klausur eintragen',
    );
    expect(entryTitle(graded('a', 10), 'Physik')).toBe('Klausur ändern');
  });

  it('beugt die Leistungsart, wo der Satz es verlangt', () => {
    expect(entryTitle(planned('a', { kind: 'test' }), 'Physik')).toBe(
      'Note für den Test eintragen',
    );
    expect(entryTitle(graded('a', 10, { kind: 'muendlich' }), 'Physik')).toBe(
      'Mündliche Note ändern',
    );
  });
});

describe('was sich absenden lässt', () => {
  /**
   * Klausur, GFS und Test werden angekündigt, haben also einen Termin, bevor
   * sie eine Note haben. Eine mündliche oder sonstige Note gibt es erst mit
   * ihrem Wert.
   */
  it('lässt ohne Note nur zu, was sich ankündigen lässt', () => {
    expect(canSubmit(draft({ kind: 'klausur' }))).toBe(true);
    expect(canSubmit(draft({ kind: 'gfs' }))).toBe(true);
    expect(canSubmit(draft({ kind: 'test' }))).toBe(true);
    expect(canSubmit(draft({ kind: 'muendlich' }))).toBe(false);
    expect(canSubmit(draft({ kind: 'sonstige' }))).toBe(false);
    expect(canSubmit(draft({ kind: 'muendlich', wert: 9 }))).toBe(true);
  });

  it('benennt den Knopf nach dem, was er bewirkt', () => {
    expect(submitLabel('new', draft({ wert: 10 }), false)).toBe(
      'Note eintragen',
    );
    expect(submitLabel('new', draft(), false)).toBe('Als ausstehend eintragen');
    expect(submitLabel('grade', draft({ wert: 10 }), false)).toBe(
      'Note eintragen',
    );
    expect(submitLabel('grade', draft(), false)).toBe('Änderung speichern');
    expect(submitLabel('change', draft({ wert: 10 }), false)).toBe(
      'Änderung speichern',
    );
    expect(submitLabel('change', draft(), false)).toBe('Änderung speichern');
  });

  /** Eine mündliche Note ohne Wert lässt sich nicht absenden; der Knopf darf dann kein „ausstehend“ versprechen. */
  it('bietet „ausstehend“ nur an, wo es das gibt', () => {
    expect(submitLabel('new', draft({ kind: 'muendlich' }), false)).toBe(
      'Note eintragen',
    );
  });

  it('sagt, was gerade läuft', () => {
    expect(submitLabel('new', draft({ wert: 10 }), true)).toBe(
      'Wird eingetragen …',
    );
    expect(submitLabel('change', draft({ wert: 10 }), true)).toBe(
      'Wird gespeichert …',
    );
  });

  it('sendet die Eingabe für das Fach der Skala, die Notiz ohne Rand', () => {
    expect(fieldsOf(draft({ wert: 10, notiz: '  Optik ' }), 'physik')).toEqual({
      subjectId: 'physik',
      kind: 'klausur',
      wert: 10,
      gewicht: 1,
      datum: today,
      notiz: 'Optik',
    });
    expect(fieldsOf(draft({ notiz: '   ' }), 'physik').notiz).toBe(null);
  });
});

describe('Wertungsbereich der Leistungsart', () => {
  /** Die Leistungsart legt den Wertungsbereich fest; gewählt wird er nirgends. */
  it('nennt ihn, wo das Fach schriftlich gegen mündlich wägt', () => {
    expect(kindHint('klausur', halbe)).toBe('Zählt als schriftlich.');
    expect(kindHint('gfs', halbe)).toBe('Zählt als schriftlich.');
    expect(kindHint('test', halbe)).toBe('Zählt als schriftlich.');
    expect(kindHint('muendlich', halbe)).toBe('Zählt als mündlich.');
    expect(kindHint('sonstige', halbe)).toBe('Zählt als mündlich.');
  });

  it('schweigt, wo alle Noten in einer Liste stehen', () => {
    expect(kindHint('klausur', standardgewichtung)).toBe(null);
  });
});

describe('Gewicht', () => {
  it('geht in Viertelschritten', () => {
    expect(stepGewicht(1, 1)).toBe(1.25);
    expect(stepGewicht(1, -1)).toBe(0.75);
    expect(stepGewicht(1.1, 1)).toBe(1.25);
  });

  /** Die Grenzen sind die des Schemas, das der Server prüft. */
  it('bleibt in den Grenzen, die eine Note haben darf', () => {
    expect(stepGewicht(0.25, -1)).toBe(0.25);
    expect(stepGewicht(10, 1)).toBe(10);
  });

  it('schreibt Zahlen mit Komma', () => {
    expect(gewichtText(1.25)).toBe('1,25-fach');
    expect(gewichtText(2)).toBe('2-fach');
    expect(figureText(11.333)).toBe('11,33');
    expect(figureText(11.4)).toBe('11,4');
  });
});

describe('Schritt auf der Skala', () => {
  const punkte = scaleFor('punkte').steps;
  const sechser = scaleFor('sechser').steps;

  it('setzt den Punkt dort auf, wo das Fach steht', () => {
    expect(
      nudge({ direction: 1, start: 11.4, steps: punkte, value: null }),
    ).toBe(11);
    expect(
      nudge({ direction: -1, start: 2.6, steps: sechser, value: null }),
    ).toBe(2.5);
  });

  it('setzt ihn ohne Fachschnitt in die Mitte', () => {
    expect(
      nudge({ direction: 1, start: null, steps: punkte, value: null }),
    ).toBe(8);
    expect(
      nudge({ direction: 1, start: null, steps: sechser, value: null }),
    ).toBe(3.5);
  });

  /** Besser liegt auf beiden Skalen rechts: mehr Notenpunkte, kleinere Note. */
  it('geht nach rechts zur besseren Note', () => {
    expect(nudge({ direction: 1, start: null, steps: punkte, value: 10 })).toBe(
      11,
    );
    expect(
      nudge({ direction: -1, start: null, steps: punkte, value: 10 }),
    ).toBe(9);
    expect(
      nudge({ direction: 1, start: null, steps: sechser, value: 2.25 }),
    ).toBe(2);
    expect(
      nudge({ direction: -1, start: null, steps: sechser, value: 2.25 }),
    ).toBe(2.5);
  });

  it('bleibt an den Enden der Skala stehen', () => {
    expect(nudge({ direction: 1, start: null, steps: punkte, value: 15 })).toBe(
      15,
    );
    expect(nudge({ direction: -1, start: null, steps: punkte, value: 0 })).toBe(
      0,
    );
    expect(nudge({ direction: 1, start: null, steps: sechser, value: 1 })).toBe(
      1,
    );
    expect(
      nudge({ direction: -1, start: null, steps: sechser, value: 6 }),
    ).toBe(6);
  });
});
