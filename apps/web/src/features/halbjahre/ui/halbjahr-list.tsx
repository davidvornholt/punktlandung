import { LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  buttonClass,
  errorBoxClass,
  hintClass,
} from '#/shared/ui/form-classes.ts';
import { iconButtonClass, iconSize, iconStroke } from '#/shared/ui/icon.ts';
import { IconButton } from '#/shared/ui/icon-button.tsx';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
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
import type { HalbjahrLook } from './halbjahr-look.ts';
import { halbjahrNotenText, halbjahrRemark } from './halbjahr-row-text.ts';
import { HalbjahrSwatch } from './halbjahr-swatch.tsx';

/** The columns of a row at desk width: swatch, name, dates, Notensystem, Noten, actions. */
const columnsClass =
  'desk:grid-cols-[0.6875rem_5rem_minmax(0,1.3fr)_minmax(0,1fr)_6.5rem_5.5rem] desk:gap-x-5 desk:px-3';

const deletionLabel = (
  isDeleting: boolean,
  decision: HalbjahrDeletionDecision,
) => {
  if (isDeleting) {
    return 'Wird gelöscht …';
  }
  return decision._tag === 'confirmation' ? 'Wirklich löschen' : 'Löschen';
};

/**
 * The delete button is an icon while nothing is decided and spells itself
 * out once it asks back, so the second, destroying click can be read. It
 * stays one element through both, which keeps the keyboard focus on it.
 */
const DeleteButton = ({
  decision,
  describedBy,
  disabled,
  isDeleting,
  onClick,
}: {
  readonly decision: HalbjahrDeletionDecision;
  /** Id of the sentence that says what deleting does. */
  readonly describedBy: string;
  readonly disabled: boolean;
  readonly isDeleting: boolean;
  readonly onClick: (event: { currentTarget: HTMLButtonElement }) => void;
}) => {
  const confirming = decision._tag === 'confirmation';
  const label = deletionLabel(isDeleting, decision);
  const Icon = isDeleting ? LoaderCircle : Trash2;
  return (
    <button
      aria-busy={isDeleting || undefined}
      aria-describedby={confirming ? describedBy : undefined}
      aria-label={confirming ? undefined : label}
      className={
        confirming ? buttonClass('danger', 'compact') : iconButtonClass
      }
      data-tip={confirming ? undefined : label}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {confirming ? (
        label
      ) : (
        <Icon
          aria-hidden={true}
          className={isDeleting ? 'animate-spin' : undefined}
          size={iconSize}
          strokeWidth={iconStroke}
        />
      )}
    </button>
  );
};

type RowProps = {
  readonly decision: HalbjahrDeletionDecision;
  readonly halbjahr: HalbjahrWithNotenCount;
  readonly isFinalInSchoolYear: boolean;
  /**
   * Some row of the list can be deleted. A row that cannot then leaves the
   * place of the delete button empty, so the pencils stand in one column.
   */
  readonly keepsDeletePlace: boolean;
  readonly deletionError: unknown | null;
  readonly isDeleting: boolean;
  readonly isDeletionInProgress: boolean;
  /** The row's segment on the time line is being pointed at, or the other way round. */
  readonly highlighted: boolean;
  readonly look: HalbjahrLook;
  /** ISO date. */
  readonly today: string;
  readonly onEdit: (trigger: HTMLButtonElement) => void;
  readonly onDecisionChange: (decision: HalbjahrDeletionDecision) => void;
  readonly onDelete: (
    request: Omit<HalbjahrDeletionRequest, 'focusOwnership' | 'halbjahr'>,
  ) => void;
  readonly onHighlight: (id: string | null) => void;
};

const confirmationId = (halbjahr: HalbjahrWithNotenCount): string =>
  `halbjahr-deletion-${halbjahr.id}`;

/**
 * Edit, and for a Halbjahr without Noten delete. While deleting asks back,
 * its two buttons take a line of their own under the row: the destroying
 * click is then not where the first one was, and the pencil keeps its place
 * beside the gap the delete button left. The elements stay the same through
 * both states, only their place changes, so the focus stays put.
 */
const RowActions = ({
  decision,
  halbjahr,
  isDeleting,
  isDeletionInProgress,
  isFinalInSchoolYear,
  keepsDeletePlace,
  onDecisionChange,
  onDelete,
  onEdit,
  onHighlight,
}: RowProps) => {
  const confirming = decision._tag === 'confirmation';
  const emptyPlace = keepsDeletePlace ? (
    <span aria-hidden={true} className="size-10" />
  ) : null;
  return (
    <div
      className={
        confirming
          ? 'contents'
          : 'col-start-3 desk:col-start-6 row-start-1 flex items-center justify-end gap-0.5'
      }
    >
      <IconButton
        className={
          confirming
            ? 'col-start-3 desk:col-start-6 row-start-1 mr-[2.625rem] justify-self-end'
            : ''
        }
        data-halbjahr-edit-trigger={true}
        icon={Pencil}
        label={`Bearbeiten: ${formatHalbjahrLabel(halbjahr)}`}
        onBlur={() => onHighlight(null)}
        onClick={(event) => onEdit(event.currentTarget)}
        onFocus={() => onHighlight(halbjahr.id)}
        tip="Bearbeiten"
      />
      {halbjahr.notenCount === 0 ? (
        <div
          className={
            confirming
              ? 'col-start-2 desk:col-start-4 col-end-4 desk:col-end-7 desk:row-start-2 row-start-5 desk:mt-0 mt-2 desk:mb-1 flex flex-wrap items-center desk:justify-end gap-1'
              : 'contents'
          }
        >
          <DeleteButton
            decision={decision}
            describedBy={confirmationId(halbjahr)}
            disabled={isDeletionInProgress}
            isDeleting={isDeleting}
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
          />
          {confirming ? (
            <button
              className={buttonClass('quiet', 'compact')}
              onClick={() => onDecisionChange(initialHalbjahrDeletionDecision)}
              type="button"
            >
              Behalten
            </button>
          ) : null}
        </div>
      ) : (
        emptyPlace
      )}
    </div>
  );
};

/**
 * One Halbjahr. At desk width every row is as high as one with a remark
 * under its dates, so the list keeps one rhythm.
 */
export const HalbjahrRow = (props: RowProps) => {
  const { decision, deletionError, halbjahr, highlighted, look, today } = props;
  const remark = halbjahrRemark(halbjahr, today);
  const holds = halbjahrNotenText(halbjahr);
  return (
    <li
      className={`grid desk:min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-line-soft border-b px-1 py-2.5 transition-colors duration-150 ease-standard data-hover:bg-sheet ${columnsClass}`}
      data-halbjahr-row={true}
      data-hover={flag(highlighted)}
      onPointerEnter={() => props.onHighlight(halbjahr.id)}
      onPointerLeave={() => props.onHighlight(null)}
    >
      <HalbjahrSwatch look={look} />
      <div className="desk:block flex items-baseline gap-2">
        <h3 className="font-bold text-lg">{formatHalbjahrLabel(halbjahr)}</h3>
        <p className="text-ink-soft text-xs">{halbjahr.schoolYear}</p>
      </div>
      <div className="col-span-2 desk:col-span-1 col-start-2 desk:col-start-3 desk:row-start-1 row-start-2">
        <p>
          {formatIsoDate(halbjahr.startsOn)} bis{' '}
          {formatIsoDate(halbjahr.endsOn)}
        </p>
        {remark === null ? null : (
          <p className="text-ink-soft text-sm">{remark}</p>
        )}
      </div>
      <div className="col-span-2 col-start-2 row-start-3 flex desk:contents flex-wrap gap-x-1.5 text-ink-soft text-sm">
        <p className="desk:col-start-4 desk:row-start-1 desk:text-base desk:text-ink">
          {notensystemText(halbjahr.system)}
        </p>
        <span aria-hidden={true} className="desk:hidden">
          ·
        </span>
        {/* At desk width what is still awaited stands under the Noten, as the remark stands under the dates. */}
        <div className="desk:col-start-5 desk:row-start-1 desk:block flex gap-x-1.5">
          <p className="desk:text-base">{holds.noten}</p>
          {holds.pending === null ? null : (
            <>
              <span aria-hidden={true} className="desk:hidden">
                ·
              </span>
              <p>{holds.pending}</p>
            </>
          )}
        </div>
      </div>
      <RowActions {...props} />
      {decision._tag === 'confirmation' ? (
        <p
          className="col-start-2 col-end-4 desk:row-start-2 row-start-4 desk:mt-0 mt-2 desk:mb-1 animate-eases-in text-sm"
          id={confirmationId(halbjahr)}
        >
          {halbjahrDeletionConfirmationText(
            halbjahr,
            decision.expectedFinalInSchoolYear,
          )}
        </p>
      ) : null}
      {deletionError === null ? null : (
        <p
          className={`${errorBoxClass} col-span-full desk:row-start-3 row-start-6 my-2 text-sm`}
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
};

const HalbjahrRowWithConfirmation = (
  props: Omit<RowProps, 'decision' | 'onDecisionChange'>,
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

/** Names the columns at desk width. The rows say the same without them, so screen readers skip it. */
const ColumnHeads = () => (
  <div
    aria-hidden={true}
    className={`desk:grid hidden items-end border-ink border-b-[1.5px] pb-2 text-ink-soft text-sm ${columnsClass}`}
  >
    <span className="col-span-2">Halbjahr</span>
    <span>Zeitraum</span>
    <span>Notensystem</span>
    <span>Noten</span>
  </div>
);

export const HalbjahrList = ({
  deletion,
  halbjahre,
  highlightId,
  looks,
  onDelete,
  onEdit,
  onHighlight,
  today,
}: {
  readonly deletion: ListMutation<string>;
  readonly halbjahre: ReadonlyArray<HalbjahrWithNotenCount>;
  readonly highlightId: string | null;
  readonly looks: ReadonlyMap<string, HalbjahrLook>;
  readonly onDelete: (
    request: Omit<HalbjahrDeletionRequest, 'focusOwnership'>,
  ) => void;
  readonly onEdit: (
    halbjahr: HalbjahrWithNotenCount,
    trigger: HTMLButtonElement,
  ) => void;
  readonly onHighlight: (id: string | null) => void;
  /** ISO date. */
  readonly today: string;
}) => (
  <>
    <ColumnHeads />
    <ul className="border-ink border-t-[1.5px] desk:border-t-0">
      {halbjahre.map((halbjahr) => {
        const rowState = listMutationState(deletion, halbjahr.id);
        return (
          <HalbjahrRowWithConfirmation
            deletionError={rowState.error}
            halbjahr={halbjahr}
            highlighted={halbjahr.id === highlightId}
            isDeleting={rowState.pending}
            isDeletionInProgress={rowState.disabled}
            isFinalInSchoolYear={isFinalHalbjahrInSchoolYear(
              halbjahre,
              halbjahr,
            )}
            keepsDeletePlace={halbjahre.some((entry) => entry.notenCount === 0)}
            key={halbjahr.id}
            look={looks.get(halbjahr.id) ?? 'future'}
            onDelete={(request) => onDelete({ ...request, halbjahr })}
            onEdit={(trigger) => onEdit(halbjahr, trigger)}
            onHighlight={onHighlight}
            today={today}
          />
        );
      })}
    </ul>
    {halbjahre.some((halbjahr) => halbjahr.notenCount > 0) ? (
      <p className={`${hintClass} mt-3`}>
        Löschen lässt sich nur ein leeres Halbjahr.
      </p>
    ) : null}
  </>
);
