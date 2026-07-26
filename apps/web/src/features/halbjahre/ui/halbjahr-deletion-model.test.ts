import { describe, expect, it, mock } from 'bun:test';

import { HalbjahrMitNotenNichtLoeschbar } from '../errors/halbjahr-errors.ts';
import type { HalbjahrMitNotenAnzahl } from '../services/halbjahr-service.ts';
import {
  findAdjacentHalbjahrEditTrigger,
  halbjahrDeletionConfirmationText,
  halbjahrDeletionSuccessMessage,
  isFinalHalbjahrInSchoolYear,
  isProtectedHalbjahrDeletionError,
  restoreHalbjahrDeletionFocus,
} from './halbjahr-deletion-model.ts';

const halbjahr = (
  id: string,
  schoolYear = '2026/27',
): HalbjahrMitNotenAnzahl => ({
  endsOn: '2027-01-31',
  half: 1,
  id,
  klassenstufe: '10',
  notenAnzahl: 0,
  schoolYear,
  startsOn: '2026-08-01',
  system: 'sechser',
});

describe('Halbjahr deletion model', () => {
  it('discloses the Fach reset only for the final Halbjahr in a Schuljahr', () => {
    const target = halbjahr('target');
    const otherHalf = { ...halbjahr('other'), half: 2 as const };

    expect(
      isFinalHalbjahrInSchoolYear([target, otherHalf], target),
    ).toBeFalse();
    expect(halbjahrDeletionConfirmationText(target, false)).toBe(
      'Das leere Halbjahr wird entfernt.',
    );

    expect(
      isFinalHalbjahrInSchoolYear(
        [target, halbjahr('later', '2027/28')],
        target,
      ),
    ).toBeTrue();
    expect(halbjahrDeletionConfirmationText(target, true)).toContain(
      'Fächer dieses Schuljahrs mit Reihenfolge, Archivstatus, Gewichtungen und schriftlichem Anteil zurückgesetzt',
    );
    expect(halbjahrDeletionSuccessMessage(target)).toBe(
      'Halbjahr 10.1 (2026/27) wurde gelöscht.',
    );
  });

  it('chooses the next row, then the previous row, for focus restoration', () => {
    const nextEditTrigger = {} as HTMLButtonElement;
    const previousEditTrigger = {} as HTMLButtonElement;
    const row = {
      nextElementSibling: {
        querySelector: mock(() => nextEditTrigger),
      },
      previousElementSibling: {
        querySelector: mock(() => previousEditTrigger),
      },
    };
    const deletionTrigger = {
      closest: mock(() => row),
    } as unknown as HTMLButtonElement;

    expect(findAdjacentHalbjahrEditTrigger(deletionTrigger)).toBe(
      nextEditTrigger,
    );
    row.nextElementSibling = null as never;
    expect(findAdjacentHalbjahrEditTrigger(deletionTrigger)).toBe(
      previousEditTrigger,
    );
  });

  it('focuses a surviving row or the create fallback after success', () => {
    const adjacent = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;
    const fallback = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;

    restoreHalbjahrDeletionFocus(adjacent, fallback);
    expect(adjacent.focus).toHaveBeenCalledTimes(1);
    expect(fallback.focus).not.toHaveBeenCalled();

    restoreHalbjahrDeletionFocus(null, fallback);
    expect(fallback.focus).toHaveBeenCalledTimes(1);
  });

  it('recognizes only the typed protected deletion rejection', () => {
    expect(
      isProtectedHalbjahrDeletionError(
        new HalbjahrMitNotenNichtLoeschbar({
          anzahl: 1,
          halbjahrId: 'target',
        }),
      ),
    ).toBeTrue();
    expect(isProtectedHalbjahrDeletionError(new Error('offline'))).toBeFalse();
  });
});
