import { useState } from 'react';

import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { notenCountText } from '#/shared/noten/noten-count-text.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import { halbjahrBezeichnung } from '#/shared/schule/klassenstufe.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type {
  HalbjahrDeletionDecision,
  HalbjahrDeletionRequest,
} from './halbjahr-deletion-model.ts';
import {
  advanceHalbjahrDeletion,
  findAdjacentHalbjahrEditTrigger,
  halbjahrDeletionConfirmationText,
  initialHalbjahrDeletionDecision,
  isFinalHalbjahrInSchoolYear,
} from './halbjahr-deletion-model.ts';

const deletionLabel = (
  isDeleting: boolean,
  decision: HalbjahrDeletionDecision,
) => {
  if (isDeleting) {
    return 'Wird gelöscht …';
  }
  return decision._tag === 'confirmation' ? 'Wirklich löschen' : 'Löschen';
};

export const HalbjahrRow = ({
  decision,
  halbjahr,
  isFinalInSchoolYear,
  deletionError,
  isDeleting,
  isDeletionInProgress,
  onBearbeiten,
  onDecisionChange,
  onDelete,
}: {
  readonly decision: HalbjahrDeletionDecision;
  readonly halbjahr: HalbjahrWithNotenCount;
  readonly isFinalInSchoolYear: boolean;
  readonly deletionError: unknown | null;
  readonly isDeleting: boolean;
  readonly isDeletionInProgress: boolean;
  readonly onBearbeiten: (trigger: HTMLButtonElement) => void;
  readonly onDecisionChange: (decision: HalbjahrDeletionDecision) => void;
  readonly onDelete: (
    request: Omit<HalbjahrDeletionRequest, 'focusOwnership' | 'halbjahr'>,
  ) => void;
}) => (
  <li
    className="border border-border bg-surface p-4 shadow-card"
    data-halbjahr-row={true}
  >
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-display text-ink text-xl tracking-tight">
        {halbjahrBezeichnung(halbjahr)}
      </h3>
      <span className="text-ink-faint text-xs uppercase tracking-widest">
        {halbjahr.schoolYear}
      </span>
    </div>
    <p className="mt-1 text-ink-muted text-sm">
      {formatIsoDate(halbjahr.startsOn)} bis {formatIsoDate(halbjahr.endsOn)} ·{' '}
      {notensystemText(halbjahr.system)}
    </p>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
      <button
        className={quietButtonClass}
        data-halbjahr-edit-trigger={true}
        onClick={(event) => onBearbeiten(event.currentTarget)}
        type="button"
      >
        Bearbeiten
      </button>
      {halbjahr.notenCount === 0 ? (
        <>
          <button
            className={quietButtonClass}
            disabled={isDeletionInProgress}
            onClick={(event) => {
              const result = advanceHalbjahrDeletion(
                decision,
                isFinalInSchoolYear,
              );
              onDecisionChange(result.decision);
              if (result.expectedFinalInSchoolYear !== null) {
                onDelete({
                  adjacentFocusTarget: findAdjacentHalbjahrEditTrigger(
                    event.currentTarget,
                  ),
                  deletionTrigger: event.currentTarget,
                  expectedFinalInSchoolYear: result.expectedFinalInSchoolYear,
                });
              }
            }}
            type="button"
          >
            {deletionLabel(isDeleting, decision)}
          </button>
          {decision._tag === 'confirmation' ? (
            <button
              className={quietButtonClass}
              onClick={() => onDecisionChange(initialHalbjahrDeletionDecision)}
              type="button"
            >
              Abbrechen
            </button>
          ) : null}
        </>
      ) : (
        <p className="self-center text-ink-faint text-sm">
          Enthält {notenCountText(halbjahr.notenCount)} und bleibt deshalb
          erhalten.
        </p>
      )}
    </div>
    {decision._tag === 'confirmation' ? (
      <p className="mt-2 text-ink-muted text-sm">
        {halbjahrDeletionConfirmationText(
          halbjahr,
          decision.expectedFinalInSchoolYear,
        )}
      </p>
    ) : null}
    {deletionError === null ? null : (
      <p
        className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
        role="alert"
      >
        {actionErrorText(
          deletionError,
          'Das Halbjahr konnte nicht gelöscht werden. Es bleibt in der Liste; versuche es erneut.',
        )}
      </p>
    )}
  </li>
);

const HalbjahrRowWithConfirmation = (
  props: Omit<
    Parameters<typeof HalbjahrRow>[0],
    'decision' | 'onDecisionChange'
  >,
) => {
  const [decision, setDecision] = useState<HalbjahrDeletionDecision>(
    initialHalbjahrDeletionDecision,
  );
  return (
    <HalbjahrRow
      {...props}
      decision={decision}
      onDecisionChange={setDecision}
    />
  );
};

export const HalbjahrListe = ({
  halbjahre,
  deletion,
  onBearbeiten,
  onDelete,
}: {
  readonly halbjahre: ReadonlyArray<HalbjahrWithNotenCount>;
  readonly deletion: ListMutation<string>;
  readonly onBearbeiten: (
    halbjahr: HalbjahrWithNotenCount,
    trigger: HTMLButtonElement,
  ) => void;
  readonly onDelete: (
    request: Omit<HalbjahrDeletionRequest, 'focusOwnership'>,
  ) => void;
}) => (
  <ul className="mt-4 space-y-3">
    {halbjahre.map((halbjahr) => {
      const rowState = listMutationState(deletion, halbjahr.id);
      return (
        <HalbjahrRowWithConfirmation
          halbjahr={halbjahr}
          isFinalInSchoolYear={isFinalHalbjahrInSchoolYear(halbjahre, halbjahr)}
          key={halbjahr.id}
          deletionError={rowState.error}
          isDeleting={rowState.pending}
          isDeletionInProgress={rowState.disabled}
          onBearbeiten={(trigger) => onBearbeiten(halbjahr, trigger)}
          onDelete={(request) => onDelete({ ...request, halbjahr })}
        />
      );
    })}
  </ul>
);
