/**
 * The one rule for how a Halbjahr is coloured wherever Halbjahre are told
 * apart by colour. The current Halbjahr has the red of its Noten. The ones
 * before it are ink that fades: the theme has four strata for them, from
 * `stratum-3` for the Halbjahr right before the current one down to
 * `stratum-0`, the palest, for everything four or more Halbjahre back.
 */

/** A tone of the theme for an older Halbjahr: the `N` of `--pl-stratum-N`. */
export type Stratum = 0 | 1 | 2 | 3;

/** Where a Halbjahr lies seen from the current one. */
export type HalbjahrPlace = 'future' | 'current' | Stratum;

const strongest = 3;
const palest = 0;
/** From the Halbjahr right before the current one to the palest. */
const fading: ReadonlyArray<Stratum> = [strongest, 2, 1, palest];

/** `age` counts Halbjahre back from the current one; a negative age lies ahead. */
export const placeAtAge = (age: number): HalbjahrPlace => {
  if (age < 0) {
    return 'future';
  }
  if (age === 0) {
    return 'current';
  }
  return fading[age - 1] ?? palest;
};

/**
 * The place of every Halbjahr by its id. Halbjahre are counted in the order
 * they begin. When `currentId` names none of them, none has begun and all of
 * them lie ahead.
 */
export const halbjahrPlaces = (
  halbjahre: ReadonlyArray<{
    readonly id: string;
    /** ISO date. */
    readonly startsOn: string;
  }>,
  currentId: string | null,
): ReadonlyMap<string, HalbjahrPlace> => {
  const sorted = [...halbjahre].sort((left, right) =>
    left.startsOn.localeCompare(right.startsOn),
  );
  // Not found is -1, the place before the first Halbjahr: all of them lie ahead.
  const current = sorted.findIndex((halbjahr) => halbjahr.id === currentId);
  return new Map(
    sorted.map((halbjahr, index) => [halbjahr.id, placeAtAge(current - index)]),
  );
};
