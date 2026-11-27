/**
 * The two tables of the Zeugnis page are set alike, so a row of the
 * Jahresvorschau is as high as a row of the Halbjahresnoten, whether or not
 * it holds a magnifier.
 */
export const headClass =
  'px-1 pb-2 align-bottom font-normal text-ink-soft text-sm desk:px-2.5';

export const cellClass =
  'h-[2.9375rem] px-1 py-1.5 align-middle desk:h-[3.0625rem] desk:px-2.5 desk:py-[0.4375rem]';

export const rowClass =
  'border-line-soft border-t first:border-ink first:border-t-[1.5px]';

/** A long Fach name is divided where German divides it; a name with no such place still breaks. */
export const fachNameClass = 'hyphens-auto [overflow-wrap:anywhere]';

/**
 * What explains a table stands below it, or beside it where there is room.
 * Beside it, its first line shares the baseline of the first Fach.
 */
export const legendClass =
  'grid max-w-[68ch] gap-3 @[60rem]:pt-[2.6875rem] pt-3.5 text-pretty text-ink-soft text-sm';
