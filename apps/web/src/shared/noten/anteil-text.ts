const percent = 100;

/** A non-breaking space keeps the figure and its sign on one line. */
const nbsp = ' ';

/**
 * The share of a Schnitt a Leistung carries, as a whole percentage: "40 %".
 * A share too small to round to one percent is said as such rather than as
 * zero, because the Leistung does count.
 */
export const anteilText = (anteil: number): string => {
  const rounded = Math.round(anteil * percent);
  return anteil > 0 && rounded === 0 ? `unter 1${nbsp}%` : `${rounded}${nbsp}%`;
};
