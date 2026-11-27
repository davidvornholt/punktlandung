import { nbsp } from '#/shared/date/date-text.ts';

/** What joins the parts of a line: "Mo 16.11. · zählt 40 %". */
export const dotSeparator = ' · ';

/** The space between a figure and its unit, as in "11 P." and "40 %". */
const unitGap = / (?=P\.|%)/gu;

/**
 * Ties every figure of a sentence to its unit, so that no line ends between
 * "11" and "P.". The sentences themselves are written with plain spaces,
 * because that is how they are compared and searched.
 */
export const tieUnits = (sentence: string): string =>
  sentence.replaceAll(unitGap, nbsp);
