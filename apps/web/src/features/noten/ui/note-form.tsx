import type { RefObject } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
  sekundaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { NotenFelder } from '../schemas/note-schema.ts';
import { notenGrenzen } from '../schemas/note-schema.ts';
import type { NoteMitFach } from '../services/noten-service.ts';
import { leistungsartLabel } from './leistungsart-label.ts';
import type { NoteEingaben } from './note-form-modell.ts';
import {
  leereNoteEingaben,
  noteEingaben,
  noteFelderAusEingaben,
} from './note-form-modell.ts';

const liesWerte = (form: HTMLFormElement): NotenFelder => {
  const daten = new FormData(form);
  const feld = (name: keyof NoteEingaben) => `${daten.get(name) ?? ''}`;
  return noteFelderAusEingaben({
    subjectId: feld('subjectId'),
    kind: feld('kind'),
    area: feld('area'),
    wert: feld('wert'),
    gewicht: feld('gewicht'),
    datum: feld('datum'),
    notiz: feld('notiz'),
  });
};

type Fachauswahl = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}>;

/**
 * Wählbare Fächer: der aktuelle Fachstand und zusätzlich das Fach der
 * bearbeiteten Note, falls es archiviert wurde. Ohne diese Option fiele das
 * Auswahlfeld auf das erste Fach zurück und das Speichern verschöbe die Note
 * stillschweigend in ein fremdes Fach.
 */
const fachAuswahl = (faecher: Fachauswahl, note: NoteMitFach | null) =>
  note === null || faecher.some((fach) => fach.id === note.fachId)
    ? faecher
    : [...faecher, { id: note.fachId, name: `${note.fachName} (archiviert)` }];

type NoteFormGemeinsam = {
  readonly faecher: Fachauswahl;
  readonly term: {
    readonly system: Notensystem;
    readonly startsOn: string;
    readonly endsOn: string;
  };
  readonly beschaeftigt: boolean;
  readonly fehler: string | null;
  readonly formularRef: RefObject<HTMLFormElement | null>;
  readonly onSpeichern: (werte: NotenFelder) => void;
};

/**
 * Die beiden Rollen des Formulars. Nur der Schnelleintrag braucht ein
 * vorgeschlagenes Datum; beim Bearbeiten kommt es aus der Note selbst, und
 * abbrechen lässt sich nur eine offene Bearbeitung.
 */
type NoteFormEigenschaften =
  | (NoteFormGemeinsam & {
      readonly note: null;
      readonly onAbbrechen: null;
      readonly vorgabeDatum: string;
    })
  | (NoteFormGemeinsam & {
      readonly note: NoteMitFach;
      readonly onAbbrechen: () => void;
    });

/**
 * Das Notenformular in beiden Rollen: als Eintragsleiste für den
 * Schnelleintrag (`note === null`) und als Bearbeitungsformular für eine
 * bestehende Note.
 */
export const NoteForm = (eigenschaften: NoteFormEigenschaften) => {
  const {
    beschaeftigt,
    faecher,
    fehler,
    formularRef,
    note,
    onAbbrechen,
    onSpeichern,
    term,
  } = eigenschaften;
  const werte =
    eigenschaften.note === null
      ? leereNoteEingaben(eigenschaften.vorgabeDatum)
      : noteEingaben(eigenschaften.note);
  const bearbeitet = note !== null;
  const punkteSystem = term.system === 'punkte';
  const knopfText = beschaeftigt
    ? `Note wird ${bearbeitet ? 'gespeichert' : 'eingetragen'} …`
    : `Note ${bearbeitet ? 'speichern' : 'eintragen'}`;

  return (
    <form
      aria-label={bearbeitet ? 'Note bearbeiten' : 'Note eintragen'}
      className="border border-border bg-surface p-4 shadow-card"
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        onSpeichern(liesWerte(ereignis.currentTarget));
      }}
      ref={formularRef}
    >
      {bearbeitet ? (
        <p className={`${labelKlasse} mb-3`}>Note bearbeiten</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
        <label className={labelKlasse}>
          Fach
          <select
            className={eingabeKlasse}
            defaultValue={werte.subjectId}
            name="subjectId"
            required={true}
          >
            {fachAuswahl(faecher, note).map((fach) => (
              <option key={fach.id} value={fach.id}>
                {fach.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelKlasse}>
          Art
          <select
            className={eingabeKlasse}
            defaultValue={werte.kind}
            name="kind"
          >
            {Object.entries(leistungsartLabel).map(([wert, label]) => (
              <option key={wert} value={wert}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelKlasse}>
          {punkteSystem ? 'Punkte' : 'Note'}
          <input
            className={eingabeKlasse}
            defaultValue={werte.wert}
            inputMode="decimal"
            max={
              punkteSystem ? notenGrenzen.punkteMax : notenGrenzen.sechserMax
            }
            min={punkteSystem ? 0 : notenGrenzen.sechserMin}
            name="wert"
            required={true}
            step={punkteSystem ? 1 : notenGrenzen.gewichtSchritt}
            type="number"
          />
        </label>
        <label className={labelKlasse}>
          Datum
          <input
            className={eingabeKlasse}
            defaultValue={werte.datum}
            max={term.endsOn}
            min={term.startsOn}
            name="datum"
            required={true}
            type="date"
          />
        </label>
        <div className="col-span-2 flex gap-3 sm:col-span-1">
          <button
            className={`${primaerKnopfKlasse} ${onAbbrechen === null ? 'w-full sm:w-auto' : ''}`}
            disabled={beschaeftigt}
            type="submit"
          >
            {knopfText}
          </button>
          {onAbbrechen === null ? null : (
            <button
              className={sekundaerKnopfKlasse}
              onClick={onAbbrechen}
              type="button"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
      <details className="mt-3" open={bearbeitet}>
        <summary className="cursor-pointer text-ink-muted text-sm">
          Gewicht, Bereich und Notiz
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className={labelKlasse}>
            Gewicht
            <input
              className={eingabeKlasse}
              defaultValue={werte.gewicht}
              inputMode="decimal"
              max={notenGrenzen.gewichtMax}
              min={notenGrenzen.gewichtSchritt}
              name="gewicht"
              step={notenGrenzen.gewichtSchritt}
              type="number"
            />
          </label>
          <label className={labelKlasse}>
            Bereich
            <select
              className={eingabeKlasse}
              defaultValue={werte.area}
              name="area"
            >
              <option value="">Automatisch nach Art</option>
              <option value="schriftlich">Schriftlich</option>
              <option value="muendlich">Mündlich</option>
            </select>
          </label>
          <label className={`${labelKlasse} col-span-2 sm:col-span-1`}>
            Notiz
            <input
              className={eingabeKlasse}
              defaultValue={werte.notiz}
              name="notiz"
            />
          </label>
        </div>
      </details>
      {fehler === null ? null : (
        <p
          className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          {fehler}
        </p>
      )}
    </form>
  );
};
