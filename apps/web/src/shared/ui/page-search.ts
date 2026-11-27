/**
 * What the address of a page may carry besides its path. Each parser keeps
 * what it knows and drops the rest, so a mistyped or outdated link still
 * opens the page.
 */

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const yes = (value: unknown): true | undefined =>
  value === true || value === 'true' ? true : undefined;

/** Leaves out what is not set, so the address stays as short as what it says. */
const defined = <Search extends Record<string, unknown>>(
  search: Search,
): Search =>
  Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined),
  ) as Search;

export type NotenSearch = {
  /** The Halbjahr shown; the current one when left out. */
  readonly halbjahr?: string;
  /** With `neu` the Fach a Note is being entered in, without it the Fach to scroll to. */
  readonly fach?: string;
  /** A Note is being entered: without `fach` the Fach is asked for first. */
  readonly neu?: true;
};

export const parseNotenSearch = (
  search: Record<string, unknown>,
): NotenSearch =>
  defined({
    halbjahr: text(search.halbjahr),
    fach: text(search.fach),
    neu: yes(search.neu),
  });

export type LeistungSearch = {
  /** The Note of this Leistung is being entered or changed. */
  readonly eintragen?: true;
};

export const parseLeistungSearch = (
  search: Record<string, unknown>,
): LeistungSearch => defined({ eintragen: yes(search.eintragen) });

export type HalbjahrSearch = {
  /** The Halbjahr shown; the current one when left out. */
  readonly halbjahr?: string;
};

export const parseHalbjahrSearch = (
  search: Record<string, unknown>,
): HalbjahrSearch => defined({ halbjahr: text(search.halbjahr) });
