import { halbjahrBezeichnung } from '#/shared/schule/klassenstufe.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';

export type HalbjahrDeletionRequest = {
  readonly adjacentFocusTarget: HTMLButtonElement | null;
  readonly deletionTrigger: HTMLButtonElement;
  readonly expectedFinalInSchoolYear: boolean;
  readonly halbjahr: HalbjahrWithNotenCount;
};

export type HalbjahrDeletionDecision =
  | { readonly _tag: 'idle' }
  | {
      readonly _tag: 'confirmation';
      readonly expectedFinalInSchoolYear: boolean;
    };

export const initialHalbjahrDeletionDecision: HalbjahrDeletionDecision = {
  _tag: 'idle',
};

export type HalbjahrDeletionAdvance =
  | {
      readonly decision: HalbjahrDeletionDecision;
      readonly expectedFinalInSchoolYear: null;
    }
  | {
      readonly decision: HalbjahrDeletionDecision;
      readonly expectedFinalInSchoolYear: boolean;
    };

export const advanceHalbjahrDeletion = (
  decision: HalbjahrDeletionDecision,
  currentFinalInSchoolYear: boolean,
): HalbjahrDeletionAdvance =>
  decision._tag === 'idle'
    ? {
        decision: {
          _tag: 'confirmation',
          expectedFinalInSchoolYear: currentFinalInSchoolYear,
        },
        expectedFinalInSchoolYear: null,
      }
    : {
        decision: initialHalbjahrDeletionDecision,
        expectedFinalInSchoolYear: decision.expectedFinalInSchoolYear,
      };

export const isFinalHalbjahrInSchoolYear = (
  halbjahre: ReadonlyArray<HalbjahrWithNotenCount>,
  halbjahr: HalbjahrWithNotenCount,
): boolean =>
  !halbjahre.some(
    (candidate) =>
      candidate.id !== halbjahr.id &&
      candidate.schoolYear === halbjahr.schoolYear,
  );

export const halbjahrDeletionConfirmationText = (
  halbjahr: HalbjahrWithNotenCount,
  isFinalInSchoolYear: boolean,
): string =>
  isFinalInSchoolYear
    ? `Das leere Halbjahr wird entfernt. Da es das letzte Halbjahr im Schuljahr ${halbjahr.schoolYear} ist, werden auch die konfigurierten Fächer dieses Schuljahrs mit Reihenfolge, Archivstatus, Gewichtungen und schriftlichem Anteil zurückgesetzt.`
    : 'Das leere Halbjahr wird entfernt.';

export const halbjahrDeletionSuccessMessage = (
  halbjahr: HalbjahrWithNotenCount,
): string =>
  `Halbjahr ${halbjahrBezeichnung(halbjahr)} (${halbjahr.schoolYear}) wurde gelöscht.`;

export const findAdjacentHalbjahrEditTrigger = (
  deletionTrigger: HTMLButtonElement,
): HTMLButtonElement | null => {
  const row = deletionTrigger.closest('[data-halbjahr-row]');
  const adjacentRow = row?.nextElementSibling ?? row?.previousElementSibling;
  return (
    adjacentRow?.querySelector<HTMLButtonElement>(
      '[data-halbjahr-edit-trigger]',
    ) ?? null
  );
};

type FocusTarget = {
  readonly focus: () => void;
  readonly isConnected: boolean;
};

export const restoreHalbjahrDeletionFocus = ({
  activeElement,
  adjacentTarget,
  createTrigger,
  deletionTrigger,
  formControl,
}: {
  readonly activeElement: Element | null;
  readonly adjacentTarget: FocusTarget | null;
  readonly createTrigger: FocusTarget | null;
  readonly deletionTrigger: HTMLButtonElement;
  readonly formControl: FocusTarget | null;
}): boolean => {
  if (activeElement !== deletionTrigger) {
    return false;
  }
  const target = [adjacentTarget, formControl, createTrigger].find(
    (candidate) => candidate?.isConnected,
  );
  target?.focus();
  return target !== undefined;
};

export const isProtectedHalbjahrDeletionError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  '_tag' in error &&
  // biome-ignore lint/security/noSecrets: This is a stable Effect error tag, not a credential.
  (error._tag === 'HalbjahrDeletionBlockedByNoten' ||
    // biome-ignore lint/security/noSecrets: This is a stable Effect error tag, not a credential.
    error._tag === 'HalbjahrDeletionConsequenceChanged');
