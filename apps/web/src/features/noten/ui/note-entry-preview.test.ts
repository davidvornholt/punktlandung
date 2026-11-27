import { describe, expect, it } from 'bun:test';

import { nbsp } from '#/shared/date/date-text.ts';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import type { Leistung } from '../services/noten-service.ts';
import { fachRuler } from './fach-ruler.ts';
import {
  draftId,
  type EntryDraft,
  previewEntry,
  readoutHint,
  valueWords,
  withDraft,
} from './note-entry-model.ts';

const today = '2026-11-26';

const halbe: Fachgewichtung = {
  ...standardgewichtung,
  verhaeltnis: { schriftlich: 1, muendlich: 1 },
};

const physik = { id: 'physik', name: 'Physik', gewichtung: standardgewichtung };

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

const draft = (rest: Partial<EntryDraft> = {}): EntryDraft => ({
  kind: 'klausur',
  wert: null,
  gewicht: 1,
  datum: today,
  notiz: '',
  ...rest,
});

describe('Vorschau', () => {
  const klausur = graded('k1', 12);

  /**
   * Die Vorschau rechnet nicht selbst: sie legt die Eingabe zu den Leistungen
   * des Fachs und fragt dieselbe Auswertung, die den echten Fachschnitt
   * liefert.
   */
  it('nennt den Fachschnitt, den die echte Auswertung mit der Note ergibt', () => {
    const entered = draft({ wert: 8 });
    const preview = previewEntry({
      draft: entered,
      fach: physik,
      leistung: null,
      leistungen: [klausur],
      system: 'punkte',
      today,
    });
    const real = fachRuler({
      gewichtung: physik.gewichtung,
      leistungen: [klausur, graded('neu', 8, { datum: today })],
      system: 'punkte',
      today,
    });

    expect(preview.average).toBe(real.evaluation.average);
    expect(preview.average).toBe(10);
    expect(preview.share).toBe(0.5);
    expect(preview.candidate.fulcrum).toBe(10);
    expect(preview.candidate.value).toBe(8);
    expect(preview.candidate.text).toBe('8 P.');
    expect(preview.candidate.replaces).toBe(null);
  });

  it('rechnet nach der Gewichtung des Fachs', () => {
    const muendlich = graded('m1', 6, { kind: 'muendlich' });
    const preview = previewEntry({
      draft: draft({ wert: 14, kind: 'muendlich' }),
      fach: { ...physik, gewichtung: halbe },
      leistung: null,
      leistungen: [klausur, muendlich],
      system: 'punkte',
      today,
    });

    // schriftlich 12, mündlich (6 + 14) / 2 = 10, im Verhältnis 1 : 1.
    expect(preview.average).toBe(11);
    expect(preview.share).toBe(0.25);
    expect(preview.candidate.kind).toBe('muendlich');
  });

  it('nimmt die Leistung, die geändert wird, aus der Rechnung', () => {
    const other = graded('k2', 6);
    const preview = previewEntry({
      draft: draft({ wert: 10 }),
      fach: physik,
      leistung: other,
      leistungen: [klausur, other],
      system: 'punkte',
      today,
    });

    expect(preview.average).toBe(11);
    expect(preview.candidate.replaces).toBe('k2');
  });

  /** Der Keil steht für den Fachschnitt von jetzt; ein zweiter an derselben Stelle verwischte ihn nur. */
  it('zeigt keinen zweiten Keil, wenn der Fachschnitt bleibt, wo er ist', () => {
    const preview = previewEntry({
      draft: draft({ wert: 12 }),
      fach: physik,
      leistung: null,
      leistungen: [klausur],
      system: 'punkte',
      today,
    });

    expect(preview.average).toBe(12);
    expect(preview.candidate.fulcrum).toBe(null);
  });

  it('sagt ohne Note, was sie später zählt', () => {
    const preview = previewEntry({
      draft: draft(),
      fach: physik,
      leistung: null,
      leistungen: [klausur],
      system: 'punkte',
      today,
    });

    expect(preview.average).toBe(12);
    expect(preview.share).toBe(0.5);
    expect(preview.candidate.value).toBe(null);
    expect(preview.candidate.fulcrum).toBe(null);
    expect(preview.candidate.text).toBe(`zählt 50${nbsp}%`);
  });

  it('legt die Eingabe an die Stelle ihrer Leistung', () => {
    const other = graded('k2', 6);
    const changed = withDraft({
      draft: draft({ wert: 10 }),
      fach: physik,
      leistung: other,
      leistungen: [klausur, other],
    });
    const added = withDraft({
      draft: draft(),
      fach: physik,
      leistung: null,
      leistungen: [klausur],
    });

    expect(changed.map((entry) => entry.id)).toEqual(['k1', 'k2']);
    expect(changed.at(-1)).toMatchObject({ status: 'graded', wert: 10 });
    expect(added.map((entry) => entry.id)).toEqual(['k1', draftId(null)]);
    expect(added.at(-1)?.status).toBe('planned');
  });
});

describe('Anzeige unter der Skala', () => {
  const preview = (entered: EntryDraft, leistungen: ReadonlyArray<Leistung>) =>
    previewEntry({
      draft: entered,
      fach: physik,
      leistung: null,
      leistungen,
      system: 'punkte',
      today,
    });

  it('sagt, was die Note zählt und wo das Fach danach steht', () => {
    const entered = draft({ wert: 8 });

    expect(
      readoutHint({
        draft: entered,
        fachName: 'Physik',
        preview: preview(entered, [graded('k1', 12)]),
        system: 'punkte',
      }),
    ).toBe(
      `Zählt 50${nbsp}% des Fachschnitts. Danach steht Physik bei 10${nbsp}Notenpunkten.`,
    );
  });

  it('zählt einen einzelnen Notenpunkt in der Einzahl', () => {
    const entered = draft({ wert: 1 });

    expect(
      readoutHint({
        draft: entered,
        fachName: 'Physik',
        preview: preview(entered, []),
        system: 'punkte',
      }),
    ).toBe(
      `Zählt 100${nbsp}% des Fachschnitts. Danach steht Physik bei 1${nbsp}Notenpunkt.`,
    );
  });

  it('nennt im Sechsersystem die Note ohne Einheit', () => {
    const entered = draft({ wert: 2 });
    const sechser = previewEntry({
      draft: entered,
      fach: physik,
      leistung: null,
      leistungen: [graded('k1', 3)],
      system: 'sechser',
      today,
    });

    expect(
      readoutHint({
        draft: entered,
        fachName: 'Latein',
        preview: sechser,
        system: 'sechser',
      }),
    ).toBe(`Zählt 50${nbsp}% des Fachschnitts. Danach steht Latein bei 2,5.`);
  });

  it('sagt ohne Note, was ohne sie geschieht', () => {
    const klausur = draft();
    const muendlich = draft({ kind: 'muendlich' });

    expect(
      readoutHint({
        draft: klausur,
        fachName: 'Physik',
        preview: preview(klausur, [graded('k1', 12)]),
        system: 'punkte',
      }),
    ).toBe(
      `Setze den Punkt auf die Skala. Ohne Note wird die Klausur als ausstehend eingetragen und zählt später 50${nbsp}%.`,
    );
    expect(
      readoutHint({
        draft: muendlich,
        fachName: 'Physik',
        preview: preview(muendlich, [graded('k1', 12)]),
        system: 'punkte',
      }),
    ).toBe(
      'Setze den Punkt auf die Skala. Ohne Note lassen sich nur Klausur, GFS und Test eintragen.',
    );
  });

  it('spricht einen Wert der Skala in seinem Notensystem aus', () => {
    expect(valueWords('punkte').valueLabel(1)).toBe('1 Notenpunkt');
    expect(valueWords('punkte').valueLabel(10)).toBe('10 Notenpunkte');
    expect(valueWords('sechser').valueLabel(1.25)).toBe('Note 1,25');
    expect(valueWords('sechser').valueLabel(2)).toBe('Note 2');
  });
});
