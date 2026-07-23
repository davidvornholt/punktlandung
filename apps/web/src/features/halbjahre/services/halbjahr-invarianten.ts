import { istIsoDatumImZeitraum } from '#/shared/datum/zeitraum.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';

type HalbjahrStand = {
  readonly schoolYear: string;
  readonly system: Notensystem;
  readonly startsOn: string;
  readonly endsOn: string;
};

export type HalbjahrVerstoss = 'notensystem' | 'schoolYear' | 'zeitraum' | null;

export const halbjahrVerstoss = (
  bisher: HalbjahrStand,
  neu: HalbjahrStand,
  notenDaten: ReadonlyArray<string>,
): HalbjahrVerstoss => {
  if (notenDaten.length > 0 && bisher.system !== neu.system) {
    return 'notensystem';
  }
  if (notenDaten.length > 0 && bisher.schoolYear !== neu.schoolYear) {
    return 'schoolYear';
  }
  return notenDaten.some(
    (datum) => !istIsoDatumImZeitraum(datum, neu.startsOn, neu.endsOn),
  )
    ? 'zeitraum'
    : null;
};
