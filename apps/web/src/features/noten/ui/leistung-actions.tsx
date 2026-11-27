import { Pencil, Plus, Trash2 } from 'lucide-react';
import { type Ref, useEffect, useId, useRef } from 'react';

import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  buttonClass,
  errorBoxClass,
  quietButtonClass,
} from '#/shared/ui/form-classes.ts';
import { buttonIconSize, iconStroke } from '#/shared/ui/icon.ts';

/** Asks before the Leistung is deleted, in the place of the actions, and stays while it is being deleted. */
const DeleteQuestion = ({
  onDelete,
  onKeep,
  pending,
  question,
}: {
  readonly onDelete: () => void;
  readonly onKeep: () => void;
  readonly pending: boolean;
  readonly question: string;
}) => {
  const questionId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  // Keeping is the answer that cannot be regretted, so it is the one at hand.
  useEffect(() => keepRef.current?.focus(), []);
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2">
      <p className="font-bold" id={questionId}>
        {question}
      </p>
      <span className="flex gap-2">
        <button
          aria-busy={pending || undefined}
          aria-describedby={questionId}
          aria-disabled={pending}
          className={buttonClass('primary')}
          onClick={pending ? undefined : onDelete}
          type="button"
        >
          {pending ? 'Wird gelöscht …' : 'Löschen'}
        </button>
        <button
          // The keyboard lands here, so this button says what is asked too.
          aria-describedby={questionId}
          className={buttonClass('secondary')}
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

export type LeistungActionsProps = {
  /** The question whether to delete is open. */
  readonly asking: boolean;
  /** Why the last attempt to delete failed; `null` without a failure. */
  readonly deleteError: unknown | null;
  readonly deleting: boolean;
  /** The button that opens the entry; the keyboard returns to it when the entry closes. */
  readonly entryButtonRef: Ref<HTMLButtonElement>;
  /** The Leistung has a Note, so the entry changes it. */
  readonly graded: boolean;
  readonly onAsk: () => void;
  readonly onDelete: () => void;
  readonly onEnter: () => void;
  readonly onKeep: () => void;
  /** "Klausur vom 16.11. löschen?" */
  readonly question: string;
};

/**
 * What can be done to the Leistung. A Leistung that waits for its Note is
 * there to get one, so that is the filled button; one that has its Note is
 * rarely changed. On a phone the first action spans the width, under the
 * thumb.
 */
export const LeistungActions = ({
  asking,
  deleteError,
  deleting,
  entryButtonRef,
  graded,
  onAsk,
  onDelete,
  onEnter,
  onKeep,
  question,
}: LeistungActionsProps) => {
  const trashRef = useRef<HTMLButtonElement>(null);
  const EntryIcon = graded ? Pencil : Plus;
  return (
    <div data-leistung-actions="">
      {asking || deleting ? (
        <DeleteQuestion
          onDelete={onDelete}
          onKeep={() => {
            onKeep();
            // The question goes away with its buttons; the keyboard goes back to where it came from.
            requestAnimationFrame(() => trashRef.current?.focus());
          }}
          pending={deleting}
          question={question}
        />
      ) : (
        // On a phone the first button takes the room beside "Löschen"; on a tablet held upright that would be most of the page, so it stops growing.
        <div className="desk:flex grid grid-cols-[minmax(0,24rem)_auto] desk:flex-wrap justify-start gap-2">
          <button
            className={buttonClass(graded ? 'secondary' : 'primary')}
            onClick={onEnter}
            ref={entryButtonRef}
            type="button"
          >
            <EntryIcon
              aria-hidden={true}
              size={buttonIconSize}
              strokeWidth={iconStroke}
            />
            {graded ? 'Bearbeiten' : 'Note eintragen'}
          </button>
          <button
            className={quietButtonClass}
            onClick={onAsk}
            ref={trashRef}
            type="button"
          >
            <Trash2
              aria-hidden={true}
              size={buttonIconSize}
              strokeWidth={iconStroke}
            />
            Löschen
          </button>
        </div>
      )}
      {deleteError === null ? null : (
        <p className={`${errorBoxClass} mt-3 text-sm`} role="alert">
          {actionErrorText(
            deleteError,
            'Die Leistung konnte nicht gelöscht werden. Sie bleibt erhalten; prüfe die Verbindung und versuche es erneut.',
          )}
        </p>
      )}
    </div>
  );
};
