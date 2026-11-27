import { daysBetween } from '#/shared/date/calendar-date.ts';
import { addDays, nbsp } from '#/shared/date/date-text.ts';
import { tenths } from '#/shared/ui/ruler/geometry.ts';

/**
 * The Verlauf band: the running Gesamtschnitt as a line over time, the
 * Halbjahre along the time axis, one small tick per Note, and where the hand
 * stands for every number of Noten. Plain arithmetic, tested without a browser.
 */

export type VerlaufEntry = {
  /** ISO date. Entries are in the order their Noten were written. */
  readonly datum: string;
  /** The running Gesamtschnitt after this Note, in Notenpunkte. */
  readonly schnitt: number | null;
  readonly halbjahrId: string;
};

export type VerlaufHalbjahr = {
  readonly id: string;
  readonly label: string;
  readonly startsOn: string;
};

export type VerlaufPoint = { readonly x: number; readonly y: number };

export type VerlaufLayout = {
  readonly width: number;
  readonly height: number;
  readonly phone: boolean;
  /** The y of the highest grid line. The line is cut where it leaves the band above it or below the time axis. */
  readonly top: number;
  /** The y of the time axis. */
  readonly base: number;
  /** The width that carries time; the labels of the values stand to its right. */
  readonly plot: number;
  /** The day at the left edge. */
  readonly start: string;
  /** The number of days the plot spans. */
  readonly days: number;
  readonly grid: ReadonlyArray<{
    readonly y: number;
    readonly value: number;
    readonly whole: boolean;
    readonly label: string | null;
  }>;
  /** Where a Halbjahr begins; the label is left out where it would run into the one before. */
  readonly marks: ReadonlyArray<{
    readonly id: string;
    readonly x: number;
    readonly label: string | null;
  }>;
  /** One tick on the time axis per Note. */
  readonly rug: string;
  readonly line: string;
  /**
   * Where the hand stands when the first `n` Noten lie on the bar: index 0 is
   * before the first Note, the last index is today.
   */
  readonly hands: ReadonlyArray<VerlaufPoint>;
};

const band = {
  minWidth: 240,
  phoneBelow: 640,
  height: 122,
  phoneHeight: 104,
  top: 8,
  /** Room under the time axis for the names of the Halbjahre. */
  foot: 26,
  /** Room at the right for the labels of the values. */
  labelRoom: 50,
  phoneLabelRoom: 38,
  /** The grid lines run this far past the plot. */
  gridOverhang: 6,
  /** Days shown before the first Note and after today. */
  leadDays: 18,
  tailDays: 2,
  /**
   * The first few Noten swing the Schnitt widely. The band is scaled to what
   * comes after them, so a tenth of a Notenpunkt can be read off it.
   */
  calmAfter: 8,
  calmShare: 3,
  valuePadding: 0.15,
  maxSteps: 6,
  minNotenpunkte: 0,
  maxNotenpunkte: 15,
  rug: 5,
  /** The hand's knob may rise this far above the top line. */
  knobAbove: 2,
  /** A pointer this close to today's end of the plot means today. */
  liveSnap: 6,
  markLabelGap: 44,
  phoneMarkLabelGap: 34,
} as const;

/** The distances between two grid lines the band may use, finest first. */
const gridSteps = { half: 0.5, one: 1, two: 2, five: 5 } as const;

type ValueRange = {
  readonly low: number;
  readonly high: number;
  readonly step: number;
};

/** The range around `values` in whole steps, when it takes no more lines than the band has room for. */
const rangeOf = (
  values: ReadonlyArray<number>,
  step: number,
): ValueRange | null => {
  const min = Math.min(...values) - band.valuePadding;
  const max = Math.max(...values) + band.valuePadding;
  const low = Math.max(band.minNotenpunkte, Math.floor(min / step) * step);
  const high = Math.min(band.maxNotenpunkte, Math.ceil(max / step) * step);
  return (high - low) / step <= band.maxSteps ? { low, high, step } : null;
};

const valueRange = (entries: ReadonlyArray<VerlaufEntry>): ValueRange => {
  const values = entries.flatMap((entry) =>
    entry.schnitt === null ? [] : [entry.schnitt],
  );
  const skip = Math.min(
    band.calmAfter,
    Math.floor(values.length / band.calmShare),
  );
  const calm = values.slice(skip);
  for (const step of Object.values(gridSteps)) {
    if (calm.length > 0 && rangeOf(calm, step) !== null) {
      // The grid is as fine as the calm stretch allows. Of the first Noten,
      // every one that fits the band at that grid is on the scale as well, so
      // the line leaves the band only where it has to.
      for (let from = 0; from <= skip; from += 1) {
        const range = rangeOf(values.slice(from), step);
        if (range !== null) {
          return range;
        }
      }
    }
  }
  return {
    low: band.minNotenpunkte,
    high: band.maxNotenpunkte,
    step: gridSteps.five,
  };
};

const gridOf = (
  { low, high, step }: ValueRange,
  yOf: (value: number) => number,
  phone: boolean,
): VerlaufLayout['grid'] =>
  Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => {
    const value = low + index * step;
    const whole = Number.isInteger(value);
    const unit = phone ? '' : `${nbsp}P.`;
    return {
      y: tenths(yOf(value)),
      value,
      whole,
      label: whole ? `${value}${unit}` : null,
    };
  });

const marksOf = (
  entries: ReadonlyArray<VerlaufEntry>,
  halbjahre: ReadonlyArray<VerlaufHalbjahr>,
  frame: { readonly xOf: (isoDate: string) => number; readonly gap: number },
): VerlaufLayout['marks'] => {
  const used = new Set(entries.map((entry) => entry.halbjahrId));
  let labelled = Number.NEGATIVE_INFINITY;
  return [...halbjahre]
    .filter((halbjahr) => used.has(halbjahr.id))
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn))
    .map((halbjahr) => {
      const x = tenths(Math.max(0, frame.xOf(halbjahr.startsOn)));
      const fits = x - labelled >= frame.gap;
      if (fits) {
        labelled = x;
      }
      return { id: halbjahr.id, x, label: fits ? halbjahr.label : null };
    });
};

export const verlaufLayout = ({
  entries,
  halbjahre,
  hostWidth,
  today,
}: {
  readonly entries: ReadonlyArray<VerlaufEntry>;
  readonly halbjahre: ReadonlyArray<VerlaufHalbjahr>;
  readonly hostWidth: number;
  /** ISO date. */
  readonly today: string;
}): VerlaufLayout => {
  const width = Math.max(band.minWidth, Math.floor(hostWidth));
  const phone = width < band.phoneBelow;
  const height = phone ? band.phoneHeight : band.height;
  const base = height - band.foot;
  const plot = width - (phone ? band.phoneLabelRoom : band.labelRoom);
  const first = entries[0]?.datum ?? today;
  const lastDatum = entries.at(-1)?.datum ?? today;
  const end = lastDatum > today ? lastDatum : today;
  const start = addDays(first, -band.leadDays);
  const days = daysBetween(start, end) + band.tailDays;
  const xOf = (isoDate: string): number =>
    (daysBetween(start, isoDate) / days) * plot;
  const range = valueRange(entries);
  const yOf = (value: number): number =>
    base - ((value - range.low) / (range.high - range.low)) * (base - band.top);
  const knobY = (value: number | null): number =>
    tenths(
      Math.max(
        band.top - band.knobAbove,
        Math.min(base, yOf(value ?? range.low)),
      ),
    );
  const drawn = entries.filter((entry) => entry.schnitt !== null);
  const path = drawn
    .map(
      (entry, index) =>
        `${index === 0 ? 'M' : 'L'}${tenths(xOf(entry.datum))} ${tenths(yOf(entry.schnitt ?? 0))}`,
    )
    .join('');
  return {
    width,
    height,
    phone,
    top: band.top,
    base,
    plot,
    start,
    days,
    grid: gridOf(range, yOf, phone),
    marks: marksOf(entries, halbjahre, {
      xOf,
      gap: phone ? band.phoneMarkLabelGap : band.markLabelGap,
    }),
    rug: entries
      .map(
        (entry) =>
          `M${tenths(xOf(entry.datum))} ${base - band.rug}v${band.rug}`,
      )
      .join(''),
    line: path === '' ? '' : `${path}H${tenths(xOf(end))}`,
    hands: [
      { x: 0, y: knobY(null) },
      ...entries.map((entry, index) => ({
        x: tenths(xOf(index === entries.length - 1 ? end : entry.datum)),
        y: knobY(entry.schnitt),
      })),
    ],
  };
};

/**
 * How many Noten lie on the bar on the day a pointer at `x` points to. At
 * today's end of the plot it is all of them, whatever their dates.
 */
export const countAt = (
  layout: VerlaufLayout,
  entries: ReadonlyArray<VerlaufEntry>,
  x: number,
): number => {
  if (x >= layout.plot - band.liveSnap) {
    return entries.length;
  }
  const day = addDays(
    layout.start,
    Math.round((x / layout.plot) * layout.days),
  );
  const later = entries.findIndex((entry) => entry.datum > day);
  return later === -1 ? entries.length : later;
};
