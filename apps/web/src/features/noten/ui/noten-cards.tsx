import type { ReactNode } from 'react';

import { fachAverage } from '#/shared/noten/fach-aggregation.ts';
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

type FachGroup = {
  readonly fachId: string;
  readonly fachName: string;
  readonly noten: ReadonlyArray<NoteWithFach>;
  readonly average: number | null;
};

const groupByFach = (
  noten: ReadonlyArray<NoteWithFach>,
): ReadonlyArray<FachGroup> => {
  const groups = new Map<
    string,
    { readonly first: NoteWithFach; readonly noten: Array<NoteWithFach> }
  >();
  for (const note of noten) {
    const group = groups.get(note.fachId);
    if (group === undefined) {
      groups.set(note.fachId, { first: note, noten: [note] });
    } else {
      group.noten.push(note);
    }
  }
  return [...groups.values()].map(({ first, noten: list }) => ({
    fachId: first.fachId,
    fachName: first.fachName,
    noten: list,
    average: fachAverage(
      list.map((note) => ({
        notenwert: note.wert,
        individualGewichtung: note.gewicht,
        leistungsart: note.kind,
      })),
      first.gewichtung,
    ),
  }));
};

const formatDisplayDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
};

/**
 * Benennt die Note, auf die eine Zeilenaktion wirkt. Eine Fachkarte trägt
 * viele Zeilen, deren Knöpfe sonst alle gleich heißen — und einer davon
 * löscht.
 */
const noteLabel = (note: NoteWithFach, system: Notensystem): string =>
  `Note ${formatNote(note.wert, system)}, ${leistungsartLabel[note.kind]} vom ${formatDisplayDate(note.datum)}`;

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
const NoteRow = ({
  deleteMutation,
  form,
  isEditing,
  note,
  onDelete,
  onEdit,
  system,
  updateMutation,
}: {
  readonly deleteMutation: ListMutation<string>;
  readonly form: ReactNode;
  readonly isEditing: boolean;
  readonly note: NoteWithFach;
  readonly onDelete: (id: string) => void;
  readonly onEdit: (
    note: NoteWithFach | null,
    trigger: HTMLButtonElement,
  ) => void;
  readonly system: Notensystem;
  readonly updateMutation: ListMutation<string>;
}) => {
  const rowState = listMutationState(deleteMutation, note.id);
  /**
   * Eine gescheiterte Änderung zeigt ihren Fehler im offenen Formular. Ist die
   * Zeile längst wieder zu — weil der Speichervorgang erst nach dem Schließen
   * scheiterte —, gehört der Fehler in die Zeile, sonst bliebe die Note
   * stillschweigend ungeändert.
   */
  const updateError = isEditing
    ? null
    : listMutationState(updateMutation, note.id).error;
  const label = noteLabel(note, system);
  const formId = `notenformular-${note.id}`;
  const deleteText = rowState.pending ? 'Wird gelöscht …' : 'Löschen';
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
        onClick={(event) =>
          onEdit(isEditing ? null : note, event.currentTarget)
        }
        type="button"
      >
        Bearbeiten
      </button>
      {isEditing ? null : (
        <button
          aria-label={`${deleteText}: ${label}`}
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

/** Notenkarten: je Fach die Einzelnoten und der gewichtete Fachschnitt. */
export const NotenCards = ({
  deleteMutation,
  editNoteId,
  form,
  noten,
  onDelete,
  onEdit,
  system,
  updateMutation,
}: {
  readonly deleteMutation: ListMutation<string>;
  readonly editNoteId: string | null;
  /** Das Bearbeitungsformular; erscheint unter der bearbeiteten Note. */
  readonly form: ReactNode;
  readonly noten: ReadonlyArray<NoteWithFach>;
  readonly onDelete: (id: string) => void;
  /** Öffnet das Formular für die Note; `null` schließt die offene Zeile. */
  readonly onEdit: (
    note: NoteWithFach | null,
    trigger: HTMLButtonElement,
  ) => void;
  readonly system: Notensystem;
  /** Die geteilte Änderungsmutation; ihr Fehler gehört zur betroffenen Zeile. */
  readonly updateMutation: ListMutation<string>;
}) => (
  <div className="mt-6 space-y-4">
    {groupByFach(noten).map((group) => (
      <section
        aria-label={group.fachName}
        className="border border-border bg-surface p-4 shadow-card"
        key={group.fachId}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-ink text-xl tracking-tight">
            {group.fachName}
          </h3>
          <p className="font-display text-3xl text-ink tracking-tight">
            {group.average === null ? '—' : formatNote(group.average, system)}
            <span className="ml-2 text-ink-faint text-xs uppercase tracking-widest">
              Schnitt
            </span>
          </p>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {group.noten.map((note) => (
            <NoteRow
              deleteMutation={deleteMutation}
              form={form}
              isEditing={note.id === editNoteId}
              key={note.id}
              note={note}
              onDelete={onDelete}
              onEdit={onEdit}
              system={system}
              updateMutation={updateMutation}
            />
          ))}
        </ul>
      </section>
    ))}
  </div>
);
