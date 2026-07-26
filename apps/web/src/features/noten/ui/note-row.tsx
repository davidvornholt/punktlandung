import type { ReactNode } from 'react';

import {
  bereichLabel,
  leistungsartLabel,
} from '#/shared/noten/leistungsart-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { bereichDerLeistungsart } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { NoteWithFach } from '../services/noten-service.ts';

const formatDisplayDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
};

/**
 * Benennt die Note, auf die eine Zeilenaktion wirkt. Eine Fachkarte trägt
 * viele Zeilen, deren Knöpfe sonst alle gleich heißen — und einer davon
 * löscht. Wert, Art und Datum allein reichen dafür nicht: zwei Klausuren
 * desselben Tages mit derselben Note sind darin nicht zu unterscheiden, also
 * benennt die Zeilennummer der Fachkarte jede Zeile eindeutig.
 */
const noteLabel = (
  note: NoteWithFach,
  system: Notensystem,
  position: number,
): string =>
  `Note ${formatNote(note.wert, system)}, ${leistungsartLabel[note.kind]} vom ${formatDisplayDate(note.datum)}, Eintrag ${position}`;

/** Ein Fehler, der genau zu dieser Zeile gehört. */
const RowError = ({
  error,
  fallbackText,
}: {
  readonly error: unknown;
  readonly fallbackText: string;
}) => (
  <p
    className="basis-full border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
    role="alert"
  >
    {actionErrorText(error, fallbackText)}
  </p>
);

/** Eine Notenzeile mit ihren Aktionen und, beim Bearbeiten, dem Formular. */
export const NoteRow = ({
  deleteMutation,
  editPending,
  form,
  isEditing,
  note,
  onDelete,
  onEdit,
  position,
  savedError,
  system,
}: {
  readonly deleteMutation: ListMutation<string>;
  readonly editPending: boolean;
  readonly form: ReactNode;
  readonly isEditing: boolean;
  readonly note: NoteWithFach;
  readonly onDelete: (id: string) => void;
  readonly onEdit: (
    note: NoteWithFach | null,
    trigger: HTMLButtonElement,
  ) => void;
  readonly position: number;
  readonly savedError: unknown;
  readonly system: Notensystem;
}) => {
  const rowState = listMutationState(deleteMutation, note.id);
  /**
   * Eine gescheiterte Änderung zeigt ihren Fehler im offenen Formular. Ist die
   * Zeile längst wieder zu — weil der Speichervorgang erst nach dem Schließen
   * scheiterte —, gehört der Fehler in die Zeile, sonst bliebe die Note
   * stillschweigend ungeändert.
   */
  const updateError = isEditing ? null : savedError;
  const label = noteLabel(note, system, position);
  const formId = `notenformular-${note.id}`;
  const deleteText = rowState.pending ? 'Wird gelöscht …' : 'Löschen';
  /*
   * Der laufende Vorgang gehört in einen ganzen Satz: „Wird gelöscht …“ vor
   * einem Doppelpunkt und der Notenbeschreibung ergibt kein Deutsch.
   */
  const deleteLabel = rowState.pending
    ? `${label} wird gelöscht …`
    : `Löschen: ${label}`;
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
      <span className="font-display text-ink text-lg">
        {formatNote(note.wert, system)}
      </span>
      <span className="text-ink-muted text-sm">
        {leistungsartLabel[note.kind]}
        {note.gewichtung.verhaeltnis === null
          ? ''
          : ` · ${bereichLabel[bereichDerLeistungsart[note.kind]]}`}
        {note.gewicht === 1 ? '' : ` · Gewicht ${note.gewicht}`}
      </span>
      <span className="text-ink-faint text-sm">
        {formatDisplayDate(note.datum)}
      </span>
      {note.notiz === null ? null : (
        <span className="text-ink-faint text-sm">{note.notiz}</span>
      )}
      <button
        aria-controls={isEditing ? formId : undefined}
        aria-expanded={isEditing}
        aria-label={`Bearbeiten: ${label}`}
        className={`${quietButtonClass} ml-auto`}
        /*
         * Während ein Vorgang der Zeile läuft, führt der Knopf ins Leere: das
         * Schließen bräche das laufende Speichern nicht ab, die Änderung landete
         * trotzdem, und das Öffnen einer gerade gelöschten Zeile führte in ein
         * Formular für eine Note, die es gleich nicht mehr gibt.
         */
        disabled={rowState.disabled || (isEditing && editPending)}
        onClick={(event) =>
          onEdit(isEditing ? null : note, event.currentTarget)
        }
        type="button"
      >
        Bearbeiten
      </button>
      {isEditing ? null : (
        <button
          aria-label={deleteLabel}
          className={quietButtonClass}
          disabled={rowState.disabled}
          onClick={() => onDelete(note.id)}
          type="button"
        >
          {deleteText}
        </button>
      )}
      {isEditing ? (
        <div className="mt-2 basis-full" id={formId}>
          {form}
        </div>
      ) : null}
      {rowState.error === null ? null : (
        <RowError
          error={rowState.error}
          fallbackText="Die Note konnte nicht gelöscht werden. Sie bleibt in der Liste; versuche es erneut."
        />
      )}
      {updateError === null ? null : (
        <RowError
          error={updateError}
          fallbackText="Die Änderung an dieser Note wurde nicht gespeichert. Öffne sie erneut zum Bearbeiten und versuche es noch einmal."
        />
      )}
    </li>
  );
};
