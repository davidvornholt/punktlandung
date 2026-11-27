import { addDays, formatDayMonth } from '#/shared/date/date-text.ts';
import { tenths } from '#/shared/ui/ruler/geometry.ts';

/**
 * The time rail of "Anstehend": a vertical axis that starts today, on which
 * every angekündigte Leistung sits at its date. Leistungen whose Note is
 * missing stand above today.
 *
 * A day takes 17px in the next four weeks and far less after them, so a
 * Klausurenplan for the whole Halbjahr stays readable. Where two Leistungen
 * are too close to be written one under the other, the axis stretches between
 * them: the ticks of the days move apart, and every Leistung still sits at
 * its own day.
 */

export type RailItems = {
  /** The heights of the Leistungen whose Note is missing, oldest first. */
  readonly missing: ReadonlyArray<number>;
  /** What is still to come, in the order of the dates. */
  readonly upcoming: ReadonlyArray<{
    /** Days from today; 0 is today. */
    readonly day: number;
    readonly height: number;
  }>;
};

export type RailLayout = {
  readonly height: number;
  /** The x of the axis. */
  readonly axis: number;
  /** Where the labels of the axis end. */
  readonly labelX: number;
  /** The y of today. */
  readonly zero: number;
  /** Where the axis begins: above the missing Noten, or at today. */
  readonly axisFrom: number;
  /** The y of the middle of every item, in the order they were given. */
  readonly missing: ReadonlyArray<number>;
  readonly upcoming: ReadonlyArray<number>;
  readonly ticks: string;
  /** The Mondays, named by their date. */
  readonly weeks: ReadonlyArray<{ readonly y: number; readonly text: string }>;
};

export const railItemHeight = 48;

const rail = {
  perDay: 17,
  farPerDay: 4,
  /** Up to this day every day has its tick; after it only the Mondays do. */
  nearDays: 28,
  /** The least distance between the middles of two Leistungen. */
  gap: 50,
  phoneGap: 62,
  axis: 60,
  phoneAxis: 44,
  labelOffset: 20,
  phoneLabelOffset: 15,
  /** The room one missing Note takes. */
  late: 60,
  phoneLate: 78,
  zeroAfterMissing: 16,
  zeroAlone: 10,
  /** The first Leistung stays clear of today's mark, even when it is today. */
  firstOffset: 34,
  /** Air between two items whose text wraps. */
  between: 2,
  minHorizon: 14,
  tailDays: 2,
  /** Days of axis shown under today when nothing is to come. */
  emptyHorizon: 3,
  bottomRoom: 14,
  axisTop: 4,
  weekTick: 12,
  dayTick: 3,
  monday: 1,
} as const;

/** How far below today a day lies on an axis nothing stretches. */
const reach = (day: number): number =>
  Math.min(day, rail.nearDays) * rail.perDay +
  Math.max(0, day - rail.nearDays) * rail.farPerDay;

const isMonday = (isoDate: string): boolean =>
  new Date(`${isoDate}T00:00:00Z`).getUTCDay() === rail.monday;

type Anchor = { readonly day: number; readonly y: number };

/** The y of a day: between two Leistungen the days share the room in proportion. */
const yOfDay = (anchors: ReadonlyArray<Anchor>, day: number): number => {
  for (const [index, from] of anchors.entries()) {
    const to = anchors[index + 1];
    if (to !== undefined && from.day < day && day <= to.day) {
      const share =
        (reach(day) - reach(from.day)) / (reach(to.day) - reach(from.day));
      return from.y + (to.y - from.y) * share;
    }
  }
  return anchors[0]?.y ?? 0;
};

const placeMissing = (
  heights: ReadonlyArray<number>,
  late: number,
): { readonly ys: ReadonlyArray<number>; readonly bottom: number } => {
  let bottom = 0;
  const ys = heights.map((height, index) => {
    const y = Math.max(
      index * late + late / 2,
      bottom + (index === 0 ? 0 : rail.between) + height / 2,
    );
    bottom = y + height / 2;
    return y;
  });
  return { ys, bottom };
};

const placeUpcoming = (
  upcoming: RailItems['upcoming'],
  zero: number,
  gap: number,
): {
  readonly anchors: ReadonlyArray<Anchor>;
  readonly ys: ReadonlyArray<number>;
  readonly bottom: number;
} => {
  const anchors: Array<Anchor> = [{ day: 0, y: zero }];
  // The first Leistung also stays clear of today's mark and what stands above it.
  let last = { y: Number.NEGATIVE_INFINITY, bottom: zero };
  const ys = upcoming.map(({ day, height }) => {
    const before = anchors.at(-1) ?? { day: 0, y: zero };
    const y = Math.max(
      before.y + reach(day) - reach(before.day),
      zero + rail.firstOffset,
      last.y + gap,
      last.bottom + rail.between + height / 2,
    );
    anchors.push({ day, y });
    last = { y, bottom: y + height / 2 };
    return y;
  });
  const end = anchors.at(-1) ?? { day: 0, y: zero };
  const horizon =
    upcoming.length === 0
      ? rail.emptyHorizon
      : Math.max(rail.minHorizon, end.day + rail.tailDays);
  anchors.push({
    day: horizon,
    y: end.y + reach(horizon) - reach(end.day),
  });
  return { anchors, ys, bottom: last.bottom };
};

export const railLayout = ({
  items,
  phone,
  today,
}: {
  readonly items: RailItems;
  /** The narrow layout: the axis stands further left and an item is taller. */
  readonly phone: boolean;
  /** ISO date. */
  readonly today: string;
}): RailLayout => {
  const axis = phone ? rail.phoneAxis : rail.axis;
  const late = phone ? rail.phoneLate : rail.late;
  const missing = placeMissing(items.missing, late);
  const zero =
    items.missing.length === 0
      ? rail.zeroAlone
      : Math.max(items.missing.length * late, missing.bottom) +
        rail.zeroAfterMissing;
  const { anchors, ys, bottom } = placeUpcoming(
    items.upcoming,
    zero,
    phone ? rail.phoneGap : rail.gap,
  );
  const horizon = anchors.at(-1) ?? { day: 0, y: zero };
  const ticks: Array<string> = [];
  const weeks: Array<{ readonly y: number; readonly text: string }> = [];
  for (let day = 1; day <= horizon.day; day += 1) {
    const isoDate = addDays(today, day);
    const y = tenths(yOfDay(anchors, day));
    if (isMonday(isoDate)) {
      ticks.push(`M${axis - rail.weekTick} ${y}h${rail.weekTick}`);
      weeks.push({ y, text: formatDayMonth(isoDate) });
    } else if (day <= rail.nearDays) {
      ticks.push(`M${axis - rail.dayTick} ${y}h${rail.dayTick * 2}`);
    }
  }
  return {
    height: Math.ceil(Math.max(horizon.y, bottom + rail.bottomRoom)),
    axis,
    labelX: axis - (phone ? rail.phoneLabelOffset : rail.labelOffset),
    zero: tenths(zero),
    axisFrom: items.missing.length === 0 ? tenths(zero) : rail.axisTop,
    missing: missing.ys.map(tenths),
    upcoming: ys.map(tenths),
    ticks: ticks.join(''),
    weeks,
  };
};
