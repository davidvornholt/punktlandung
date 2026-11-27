import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { formatDayMonth } from '#/shared/date/date-text.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { buttonClass, errorBoxClass } from '#/shared/ui/form-classes.ts';
import { IconButton } from '#/shared/ui/icon-button.tsx';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
import type { Leistung } from '../services/noten-service.ts';
import { type RowStanding, RowSummary } from './note-row-summary.tsx';
import type { LeistungLinkComponent } from './noten-links.tsx';

/** What the page knows about a Leistung besides what is stored: how it lies on the bench of its Fach. */
export type RowFigure = RowStanding & {
  /** Names the Leistung: "Klausur vom 28.09.2026, 11 P.". */
  readonly label: string;
};

/** Ein Fehler, der genau zu dieser Zeile gehört. */
const RowError = ({
  error,
  fallbackText,
}: {
  readonly error: unknown;
  readonly fallbackText: string;
}) => (
  <p
    className={`${errorBoxClass} col-span-full mx-1 mb-2 text-sm`}
    role="alert"
  >
    {actionErrorText(error, fallbackText)}
  </p>
);

/** Asks before a Leistung is deleted, in the place of its row, and stays while it is being deleted. */
const DeleteQuestion = ({
  blocked,
  leistung,
  onDelete,
  onKeep,
  pending,
}: {
  /** A Leistung of the list is being deleted; a second deletion waits for it. */
  readonly blocked: boolean;
  readonly leistung: Leistung;
  readonly onDelete: () => void;
  readonly onKeep: () => void;
  readonly pending: boolean;
}) => {
  const questionId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  // Keeping is the answer that cannot be regretted, so it is the one at hand.
  useEffect(() => keepRef.current?.focus(), []);
  return (
    <div className="col-span-full flex min-h-[3.625rem] flex-wrap items-center justify-between gap-2 py-2 pr-1">
      <p className="pl-2 font-bold" id={questionId}>
        {leistungsartLabel[leistung.kind]} vom {formatDayMonth(leistung.datum)}{' '}
        löschen?
      </p>
      <span className="flex gap-2">
        <button
          aria-busy={pending || undefined}
          aria-describedby={questionId}
          aria-disabled={blocked}
          className={buttonClass('primary', 'compact')}
          onClick={blocked ? undefined : onDelete}
          type="button"
        >
          {pending ? 'Wird gelöscht …' : 'Löschen'}
        </button>
        <button
          className={buttonClass('secondary', 'compact')}
          // Keeping would not stop a deletion that is on its way.
          disabled={pending}
          onClick={onKeep}
          ref={keepRef}
          type="button"
        >
          Behalten
        </button>
      </span>
    </div>
  );
};

export type NoteRowProps = {
  readonly deleteError: unknown | null;
  readonly deleteMutation: ListMutation<string>;
  readonly figure: RowFigure;
  readonly highlighted: boolean;
  readonly leistung: Leistung;
  readonly link: LeistungLinkComponent;
  /** The row was just saved and is marked for a moment. */
  readonly marked: boolean;
  readonly onDelete: (leistung: Leistung) => void;
  readonly onEdit: (leistung: Leistung, trigger: HTMLButtonElement) => void;
  readonly onHighlight: (id: string | null) => void;
  /**
   * Benennt die Zeile unter denen ihres Fachs. Art, Datum und Note allein
   * reichen dafür nicht: zwei Klausuren desselben Tages mit derselben Note
   * sind darin nicht zu unterscheiden, und einer der Knöpfe löscht.
   */
  readonly position: number;
  /** A change to this Leistung that failed after its form was closed. */
  readonly savedError: unknown;
  readonly system: Notensystem;
  readonly today: string;
};

/** One Leistung in the list of its Fach, with what can be done to it. */
export const NoteRow = ({
  deleteError,
  deleteMutation,
  figure,
  highlighted,
  leistung,
  link,
  marked,
  onDelete,
  onEdit,
  onHighlight,
  position,
  savedError,
  system,
  today,
}: NoteRowProps) => {
  const rowState = listMutationState(deleteMutation, leistung.id);
  const [asking, setAsking] = useState(false);
  const trashRef = useRef<HTMLButtonElement>(null);
  const name = `${figure.label}, Eintrag ${position}`;
  const graded = leistung.status === 'graded';
  const question = asking || rowState.pending;
  return (
    <li
      aria-busy={rowState.pending || undefined}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center border-line-soft border-t transition-colors duration-100 ease-standard first:border-t-0 hover:bg-sheet data-hover:bg-sheet ${marked ? 'animate-marked' : ''}`}
      data-hover={flag(highlighted)}
      data-row={leistung.id}
      onPointerEnter={() => onHighlight(leistung.id)}
      onPointerLeave={() => onHighlight(null)}
    >
      {question ? (
        <DeleteQuestion
          blocked={rowState.disabled}
          leistung={leistung}
          onDelete={() => onDelete(leistung)}
          onKeep={() => {
            setAsking(false);
            // The question goes away with its buttons; the keyboard goes back to where it came from.
            requestAnimationFrame(() => trashRef.current?.focus());
          }}
          pending={rowState.pending}
        />
      ) : (
        <>
          <RowSummary
            leistung={leistung}
            link={link}
            onHighlight={onHighlight}
            standing={figure}
            system={system}
            today={today}
          />
          <span className="flex items-center gap-0.5 pr-1">
            <IconButton
              /*
               * Während eine Zeile der Liste gelöscht wird, führte der Knopf
               * ins Leere: das Formular gälte einer Note, die es gleich nicht
               * mehr gibt.
               */
              disabled={rowState.disabled}
              icon={Pencil}
              label={`${graded ? 'Bearbeiten' : 'Note eintragen'}: ${name}`}
              onClick={(event) => onEdit(leistung, event.currentTarget)}
              tip={graded ? 'Bearbeiten' : 'Note eintragen'}
            />
            <IconButton
              disabled={rowState.disabled}
              icon={Trash2}
              label={`Löschen: ${name}`}
              onClick={() => setAsking(true)}
              ref={trashRef}
              tip="Löschen"
            />
          </span>
        </>
      )}
      {deleteError === null ? null : (
        <RowError
          error={deleteError}
          fallbackText="Die Note konnte nicht gelöscht werden. Sie bleibt in der Liste; versuche es erneut."
        />
      )}
      {savedError === undefined || savedError === null ? null : (
        <RowError
          error={savedError}
          fallbackText="Die Änderung an dieser Note wurde nicht gespeichert. Öffne sie erneut zum Bearbeiten und versuche es noch einmal."
        />
      )}
    </li>
  );
};
