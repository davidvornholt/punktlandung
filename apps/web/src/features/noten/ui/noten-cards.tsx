import type { ReactNode } from 'react';

import { fachAverage } from '#/shared/noten/fach-aggregation.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import { NoteRow } from './note-row.tsx';

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

/** Notenkarten: je Fach die Einzelnoten und der gewichtete Fachschnitt. */
export const NotenCards = ({
  deleteMutation,
  editNoteId,
  editPending,
  form,
  noten,
  onDelete,
  onEdit,
  system,
  updateErrors,
}: {
  readonly deleteMutation: ListMutation<string>;
  readonly editNoteId: string | null;
  /** Läuft gerade das Speichern der offenen Bearbeitung? */
  readonly editPending: boolean;
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
  /**
   * Gescheiterte Änderungen je Note. Eine geteilte Mutation trüge nur ihren
   * letzten Ausgang, und das Speichern einer zweiten Note verschluckte den
   * Fehler der ersten.
   */
  readonly updateErrors: ReadonlyMap<string, unknown>;
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
          {group.noten.map((note, index) => (
            <NoteRow
              deleteMutation={deleteMutation}
              editPending={editPending}
              form={form}
              isEditing={note.id === editNoteId}
              key={note.id}
              note={note}
              onDelete={onDelete}
              onEdit={onEdit}
              position={index + 1}
              savedError={updateErrors.get(note.id) ?? null}
              system={system}
            />
          ))}
        </ul>
      </section>
    ))}
  </div>
);
