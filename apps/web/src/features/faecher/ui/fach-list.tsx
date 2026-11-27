import { Archive, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { gewichtungsSaetze } from '#/shared/noten/gewichtung-text.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { buttonClass, errorBoxClass } from '#/shared/ui/form-classes.ts';
import { IconButton } from '#/shared/ui/icon-button.tsx';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { Fach } from '../services/fach-service.ts';
import { GewichtungFigure } from './gewichtung-figure.tsx';

/**
 * The Gewichtung in the teacher's words. The figure above already shows how
 * the Fach is split, so that first sentence is kept for screen readers, which
 * do not get the figure.
 */
const GewichtungSentence = ({
  gewichtung,
}: {
  readonly gewichtung: Fachgewichtung;
}) => {
  const [split, ...rules] = gewichtungsSaetze(gewichtung);
  return (
    <p className="mt-2.5 text-ink-soft text-sm">
      <span className="sr-only">
        {split}
        {rules.length === 0 ? '.' : ', '}
      </span>
      {rules.length === 0 ? null : (
        <span className="inline-block first-letter:uppercase">
          {rules.join(', ')}.
        </span>
      )}
    </p>
  );
};

/**
 * The app has no way to bring an archived Fach back, so archiving asks first
 * and says what it does. The question opens under the row and takes the
 * keyboard with it, to "Behalten": the answer that cannot be regretted is the
 * one at hand. "Behalten" gives the keyboard back to the archive button.
 */
const ArchiveQuestion = ({
  fach,
  onArchive,
  onKeep,
}: {
  readonly fach: Fach;
  readonly onArchive: () => void;
  readonly onKeep: () => void;
}) => {
  const textId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => keepRef.current?.focus(), []);
  return (
    <div className="mt-3 flex animate-eases-in flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <p className="max-w-[62ch] text-pretty text-sm" id={textId}>
        <b>{fach.name} archivieren?</b> Das Fach verschwindet aus dieser Liste
        und nimmt keine neuen Noten mehr an. Seine bisherigen Noten bleiben und
        zählen weiter. Zurückholen lässt es sich in der App nicht.
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          aria-describedby={textId}
          className={buttonClass('danger', 'compact')}
          onClick={onArchive}
          type="button"
        >
          Wirklich archivieren
        </button>
        <button
          aria-describedby={textId}
          className={buttonClass('quiet', 'compact')}
          onClick={onKeep}
          ref={keepRef}
          type="button"
        >
          Behalten
        </button>
      </div>
    </div>
  );
};

type FachRowProps = {
  readonly fach: Fach;
  readonly archiveError: unknown | null;
  /** The form this Fach is being changed in; it opens under the row. */
  readonly editor: ReactNode;
  readonly isArchiving: boolean;
  readonly isArchiveRunning: boolean;
  readonly onArchive: () => void;
  readonly onEdit: (trigger: HTMLButtonElement) => void;
};

const FachRow = ({
  fach,
  archiveError,
  editor,
  isArchiving,
  isArchiveRunning,
  onArchive,
  onEdit,
}: FachRowProps) => {
  const [asking, setAsking] = useState(false);
  const archiveRef = useRef<HTMLButtonElement>(null);
  return (
    <li
      className="border-line border-t desk:py-5 py-4 first:border-t-0"
      data-fach-row={fach.id}
    >
      <div className="grid desk:grid-cols-[12.5rem_minmax(0,1fr)_auto] grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-3">
        <div className="min-w-0 desk:pt-1">
          <h3 className="wrap-break-word hyphens-auto font-bold text-lg">
            {fach.name}
          </h3>
          <p className="text-ink-soft text-sm">{fach.shortName}</p>
        </div>
        <div className="@container col-span-2 desk:col-span-1 desk:col-start-2 desk:row-start-1 row-start-2 min-w-0">
          <GewichtungFigure gewichtung={fach.gewichtung} />
          <GewichtungSentence gewichtung={fach.gewichtung} />
        </div>
        <div className="col-start-2 desk:col-start-3 row-start-1 flex items-center gap-0.5">
          <IconButton
            aria-expanded={editor !== null}
            data-fach-edit=""
            icon={Pencil}
            label={`Bearbeiten: ${fach.name}`}
            onClick={(event) => onEdit(event.currentTarget)}
            tip="Bearbeiten"
          />
          <IconButton
            aria-expanded={asking}
            data-fach-archive=""
            disabled={isArchiveRunning}
            icon={Archive}
            label={
              isArchiving
                ? `${fach.name} wird archiviert …`
                : `Archivieren: ${fach.name}`
            }
            onClick={() => setAsking(!asking)}
            pending={isArchiving}
            ref={archiveRef}
            tip="Archivieren"
          />
        </div>
      </div>
      {asking ? (
        <ArchiveQuestion
          fach={fach}
          onArchive={() => {
            setAsking(false);
            archiveRef.current?.focus();
            onArchive();
          }}
          onKeep={() => {
            setAsking(false);
            archiveRef.current?.focus();
          }}
        />
      ) : null}
      {archiveError === null ? null : (
        <p className={`${errorBoxClass} mt-3 text-sm`} role="alert">
          {actionErrorText(
            archiveError,
            'Das Fach konnte nicht archiviert werden. Es bleibt sichtbar; versuche es erneut.',
          )}
        </p>
      )}
      {editor === null ? null : <div className="mt-4">{editor}</div>}
    </li>
  );
};

export const FachList = ({
  faecher,
  archiveMutation,
  editor,
  onArchive,
  onEdit,
}: {
  readonly faecher: ReadonlyArray<Fach>;
  readonly archiveMutation: ListMutation<string>;
  /** The Fach that is being changed and its form. */
  readonly editor?:
    | { readonly id: string; readonly form: ReactNode }
    | undefined;
  readonly onArchive: (id: string) => void;
  readonly onEdit: (fach: Fach, trigger: HTMLButtonElement) => void;
}) => (
  <ul>
    {faecher.map((fach) => {
      const rowState = listMutationState(archiveMutation, fach.id);
      return (
        <FachRow
          archiveError={rowState.error}
          editor={editor?.id === fach.id ? editor.form : null}
          fach={fach}
          key={fach.id}
          onArchive={() => onArchive(fach.id)}
          onEdit={(trigger) => onEdit(fach, trigger)}
          isArchiving={rowState.pending}
          isArchiveRunning={rowState.disabled}
        />
      );
    })}
  </ul>
);
