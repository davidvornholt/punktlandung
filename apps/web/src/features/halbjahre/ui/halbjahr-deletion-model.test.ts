import { describe, expect, it } from 'bun:test';

import {
  HalbjahrDeletionBlockedByNoten,
  HalbjahrDeletionConsequenceChanged,
} from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import {
  advanceHalbjahrDeletion,
  halbjahrDeletionConfirmationText,
  halbjahrDeletionSuccessMessage,
  initialHalbjahrDeletionDecision,
  isFinalHalbjahrInSchoolYear,
  isProtectedHalbjahrDeletionError,
} from './halbjahr-deletion-model.ts';

const halbjahr = (
  id: string,
  schoolYear = '2026/27',
): HalbjahrWithNotenCount => ({
  endsOn: '2027-01-31',
  half: 1,
  id,
  klassenstufe: '10',
  notenCount: 0,
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
});

describe('Halbjahr deletion decision', () => {
  it('carries the consequence from confirmation into the delete decision', () => {
    const confirmation = advanceHalbjahrDeletion(
      initialHalbjahrDeletionDecision,
      false,
    );
    expect(confirmation.expectedFinalInSchoolYear).toBeNull();
    expect(confirmation.decision).toEqual({
      _tag: 'confirmation',
      expectedFinalInSchoolYear: false,
    });

    expect(advanceHalbjahrDeletion(confirmation.decision, true)).toEqual({
      decision: initialHalbjahrDeletionDecision,
      expectedFinalInSchoolYear: false,
    });
  });
});

describe('Halbjahr deletion refresh', () => {
  it('recognizes typed rejections that require a list refresh', () => {
    expect(
      isProtectedHalbjahrDeletionError(
        new HalbjahrDeletionBlockedByNoten({
          halbjahrId: 'target',
          notenCount: 1,
        }),
      ),
    ).toBeTrue();
    expect(
      isProtectedHalbjahrDeletionError(
        new HalbjahrDeletionConsequenceChanged({
          actualFinalInSchoolYear: true,
          expectedFinalInSchoolYear: false,
          halbjahrId: 'target',
        }),
      ),
    ).toBeTrue();
    expect(isProtectedHalbjahrDeletionError(new Error('offline'))).toBeFalse();
  });
});
