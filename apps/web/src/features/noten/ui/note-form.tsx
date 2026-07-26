import type { RefObject } from 'react';

import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import { notenLimits } from '../schemas/note-schema.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import type { NoteFormValues } from './note-form-model.ts';
import {
  emptyNoteFormValues,
  noteFieldsFromValues,
  noteFormValues,
} from './note-form-model.ts';

const readValues = (form: HTMLFormElement): NotenFields => {
  const data = new FormData(form);
  const field = (name: keyof NoteFormValues) => `${data.get(name) ?? ''}`;
  return noteFieldsFromValues({
    subjectId: field('subjectId'),
    kind: field('kind'),
    wert: field('wert'),
    gewicht: field('gewicht'),
    datum: field('datum'),
    notiz: field('notiz'),
  });
};

type FachOptions = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}>;

/**
 * Wählbare Fächer: der aktuelle Fachstand und zusätzlich das Fach der
 * bearbeiteten Note, falls es archiviert wurde. Ohne diese Option fiele das
 * Auswahlfeld auf das erste Fach zurück und das Speichern verschöbe die Note
 * stillschweigend in ein fremdes Fach.
 */
const fachOptions = (faecher: FachOptions, note: NoteWithFach | null) =>
  note === null || faecher.some((fach) => fach.id === note.fachId)
    ? faecher
    : [...faecher, { id: note.fachId, name: `${note.fachName} (archiviert)` }];

type NoteFormShared = {
  readonly faecher: FachOptions;
  readonly halbjahr: {
    readonly system: Notensystem;
    readonly startsOn: string;
    readonly endsOn: string;
  };
  readonly pending: boolean;
  readonly error: string | null;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly onSave: (values: NotenFields) => void;
};

/**
 * Die beiden Rollen des Formulars. Nur der Schnelleintrag braucht ein
 * vorgeschlagenes Datum; beim Bearbeiten kommt es aus der Note selbst, und
 * abbrechen lässt sich nur eine offene Bearbeitung.
 */
type NoteFormProps =
  | (NoteFormShared & {
      readonly note: null;
      readonly onCancel: null;
      readonly defaultDate: string;
    })
  | (NoteFormShared & {
      readonly note: NoteWithFach;
      readonly onCancel: () => void;
    });

/**
 * Das Notenformular in beiden Rollen: als Eintragsleiste für den
 * Schnelleintrag (`note === null`) und als Bearbeitungsformular für eine
 * bestehende Note.
 */
export const NoteForm = (props: NoteFormProps) => {
  const { error, faecher, formRef, halbjahr, note, onCancel, onSave, pending } =
    props;
  const values =
    props.note === null
      ? emptyNoteFormValues(props.defaultDate)
      : noteFormValues(props.note);
  const isEdit = note !== null;
  const usesNotenpunkte = halbjahr.system === 'punkte';
  const buttonText = pending
    ? `Note wird ${isEdit ? 'gespeichert' : 'eingetragen'} …`
    : `Note ${isEdit ? 'speichern' : 'eintragen'}`;

  return (
    <form
      aria-label={isEdit ? 'Note bearbeiten' : 'Note eintragen'}
      className="border border-border bg-surface p-4 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(readValues(event.currentTarget));
      }}
      ref={formRef}
    >
      {isEdit ? <p className={`${labelClass} mb-3`}>Note bearbeiten</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
        <label className={labelClass}>
          Fach
          <select
            className={inputClass}
            defaultValue={values.subjectId}
            name="subjectId"
            required={true}
          >
            {fachOptions(faecher, note).map((fach) => (
              <option key={fach.id} value={fach.id}>
                {fach.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Art
          <select className={inputClass} defaultValue={values.kind} name="kind">
            {Object.entries(leistungsartLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {usesNotenpunkte ? 'Punkte' : 'Note'}
          <input
            className={inputClass}
            defaultValue={values.wert}
            inputMode="decimal"
            max={
              usesNotenpunkte
                ? notenLimits.maxNotenpunkte
                : notenLimits.sechserMax
            }
            min={usesNotenpunkte ? 0 : notenLimits.sechserMin}
            name="wert"
            required={true}
            step={usesNotenpunkte ? 1 : notenLimits.gewichtungStep}
            type="number"
          />
        </label>
        <label className={labelClass}>
          Datum
          <input
            className={inputClass}
            defaultValue={values.datum}
            max={halbjahr.endsOn}
            min={halbjahr.startsOn}
            name="datum"
            required={true}
            type="date"
          />
        </label>
        <div className="col-span-2 flex gap-3 sm:col-span-1">
          <button
            className={`${primaryButtonClass} ${onCancel === null ? 'w-full sm:w-auto' : ''}`}
            disabled={pending}
            type="submit"
          >
            {buttonText}
          </button>
          {onCancel === null ? null : (
            <button
              className={secondaryButtonClass}
              onClick={onCancel}
              type="button"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
      <details className="mt-3" open={isEdit}>
        <summary className="cursor-pointer text-ink-muted text-sm">
          Gewicht und Notiz
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Gewicht
            <input
              className={inputClass}
              defaultValue={values.gewicht}
              inputMode="decimal"
              max={notenLimits.maxGewichtung}
              min={notenLimits.gewichtungStep}
              name="gewicht"
              step={notenLimits.gewichtungStep}
              type="number"
            />
          </label>
          <label className={labelClass}>
            Notiz
            <input
              className={inputClass}
              defaultValue={values.notiz}
              name="notiz"
            />
          </label>
        </div>
      </details>
      {error === null ? null : (
        <p
          className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
};
