import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import {
  type HalbjahrPlace,
  halbjahrPlaces,
  type Stratum,
} from '#/shared/ui/halbjahr-strata.ts';
import { currentHalbjahr } from '../services/current-halbjahr.ts';

/** What the line needs to know of a Halbjahr. */
export type Stretch = {
  readonly id: string;
  readonly klassenstufe: Klassenstufe;
  readonly half: 1 | 2;
  readonly schoolYear: string;
  readonly startsOn: string;
  readonly endsOn: string;
};

/**
 * How a Halbjahr is coloured: the current one in the red of its Noten, the
 * ones before it as ink that fades with every Halbjahr further back, and one
 * that has not begun as a dashed outline.
 */
export type HalbjahrLook = 'current' | 'future' | `stratum${Stratum}`;

const lookOf = (place: HalbjahrPlace): HalbjahrLook =>
  typeof place === 'number' ? `stratum${place}` : place;

const newestFirst = <T extends Stretch>(
  halbjahre: ReadonlyArray<T>,
): ReadonlyArray<T> =>
  [...halbjahre].sort((a, b) => b.startsOn.localeCompare(a.startsOn));

/** The look of every Halbjahr by its id. */
export const halbjahrLooks = (
  halbjahre: ReadonlyArray<Stretch>,
  today: string,
): ReadonlyMap<string, HalbjahrLook> => {
  const current = currentHalbjahr(newestFirst(halbjahre), today);
  return new Map(
    [...halbjahrPlaces(halbjahre, current?.id ?? null)].map(([id, place]) => [
      id,
      lookOf(place),
    ]),
  );
};
