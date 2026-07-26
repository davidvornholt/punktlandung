import { halbjahrBezeichnung } from '#/shared/schule/klassenstufe.ts';
import { restoreFormFocus } from '#/shared/ui/form-focus.ts';
import type { HalbjahrMitNotenAnzahl } from '../services/halbjahr-service.ts';

export type HalbjahrDeletionRequest = {
  readonly focusTarget: HTMLButtonElement | null;
  readonly halbjahr: HalbjahrMitNotenAnzahl;
};

export const isFinalHalbjahrInSchoolYear = (
  halbjahre: ReadonlyArray<HalbjahrMitNotenAnzahl>,
  halbjahr: HalbjahrMitNotenAnzahl,
): boolean =>
  !halbjahre.some(
    (candidate) =>
      candidate.id !== halbjahr.id &&
      candidate.schoolYear === halbjahr.schoolYear,
  );

export const halbjahrDeletionConfirmationText = (
  halbjahr: HalbjahrMitNotenAnzahl,
  isFinalInSchoolYear: boolean,
): string =>
  isFinalInSchoolYear
    ? `Das leere Halbjahr wird entfernt. Da es das letzte Halbjahr im Schuljahr ${halbjahr.schoolYear} ist, werden auch die konfigurierten Fächer dieses Schuljahrs mit Reihenfolge, Archivstatus, Gewichtungen und schriftlichem Anteil zurückgesetzt.`
    : 'Das leere Halbjahr wird entfernt.';

export const halbjahrDeletionSuccessMessage = (
  halbjahr: HalbjahrMitNotenAnzahl,
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

export const restoreHalbjahrDeletionFocus = (
  focusTarget: HTMLButtonElement | null,
  fallbackTrigger: HTMLButtonElement | null,
) => {
  restoreFormFocus(focusTarget, fallbackTrigger);
};

export const isProtectedHalbjahrDeletionError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  '_tag' in error &&
  // biome-ignore lint/security/noSecrets: This is a stable Effect error tag, not a credential.
  error._tag === 'HalbjahrMitNotenNichtLoeschbar';
