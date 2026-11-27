import { type RulerScale, scaleUnits } from './scale.ts';

/**
 * Where everything on a ruler lies. All of it is plain arithmetic, so it can
 * be tested without a browser. Heights are measured from the bar's top edge:
 * a disc resting on the bar has a negative `y`, the ground is at `beam`.
 */

export type RulerVariant = 'row' | 'bench' | 'zeugnis';

/** Coordinates are written to the tenth of a pixel; more would only bloat the markup. */
export const tenths = (value: number): number => Math.round(value * 10) / 10;

export type DiscKind = 'schriftlich' | 'muendlich' | 'fach';

/** `pending` is still to come, `missing` was written and has no Note yet. */
export type DiscState = 'graded' | 'pending' | 'missing';

export type RulerPoint = {
  readonly id: string;
  /** The Note in the bar's Notensystem; `null` while it has not landed. */
  readonly value: number | null;
  /** The share of the Schnitt this disc carries (0 to 1). Its area shows it. */
  readonly mass: number;
  readonly kind: DiscKind;
  readonly state: DiscState;
  /** ISO date. Discs land in this order, so a later one rests on an earlier one. */
  readonly date: string;
  /** The accessible name when the disc is a link. */
  readonly label?: string;
  /** Shown as a tooltip. */
  readonly tip?: string;
  /** The figure label beside the disc; a line break splits a waiting disc's label. */
  readonly note?: string;
  /** Written inside the disc, such as a Fach's Kürzel. */
  readonly text?: string;
  /** The disc the page is about. */
  readonly focus?: boolean;
  /** Steps back beside the disc the page is about. */
  readonly dim?: boolean;
  /** The exact value the disc comes from when it first appears, such as an unrounded Schnitt. */
  readonly origin?: number;
};

export type RulerModel = {
  readonly points: ReadonlyArray<RulerPoint>;
  /** Where the discs balance, in the bar's Notensystem. */
  readonly fulcrum: number | null;
  readonly caption?: string;
};

export type PlacedPoint = RulerPoint & {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Held off the bar because it has no Note yet. */
  readonly waiting: boolean;
};

/** The id of the disc that stands in for a Note while it is being entered. */
export const candidateId = '§candidate';

export type Geometry = {
  readonly variant: RulerVariant;
  readonly width: number;
  readonly height: number;
  /** Too narrow for a gutter and for labels with leader lines. */
  readonly phone: boolean;
  /** Where the bar's scale begins and the width of one of its 16 units. */
  readonly x0: number;
  readonly pitch: number;
  /** How far the bar itself runs on beyond each end of its scale. */
  readonly overhang: number;
  /** The bar's height, and how far its top edge lies below the figure's top. */
  readonly beam: number;
  readonly beamY: number;
  /** The radius of a disc that carries the whole Schnitt. */
  readonly rFull: number;
  /** Room beside the bar's right end for discs that have not landed. */
  readonly gutter: number;
  /** Room above the bar for them where there is no gutter. */
  readonly holdZone: number;
  readonly numerals: boolean;
  readonly labels: boolean;
  /** Distance from the figure's top to its first label row. */
  readonly top: number;
};

const variants = {
  row: {
    beam: 8,
    phoneBeam: 8,
    numerals: false,
    radius: 0.66,
    phoneRadius: 0.66,
    radiusCap: 16,
    phoneRadiusCap: 16,
    below: 13,
    phoneBelow: 13,
    gutter: 36,
    labels: false,
    top: 6,
  },
  bench: {
    beam: 40,
    phoneBeam: 36,
    numerals: true,
    radius: 0.7,
    phoneRadius: 0.92,
    radiusCap: 34,
    phoneRadiusCap: 34,
    below: 62,
    phoneBelow: 62,
    gutter: 104,
    labels: true,
    top: 12,
  },
  zeugnis: {
    beam: 44,
    phoneBeam: 36,
    numerals: true,
    radius: 0.47,
    phoneRadius: 0.6,
    radiusCap: 27,
    phoneRadiusCap: Number.POSITIVE_INFINITY,
    below: 128,
    phoneBelow: 104,
    gutter: 0,
    labels: false,
    top: 10,
  },
} as const;

const limits = {
  minWidth: 240,
  phoneBelow: 560,
  labelsFromPitch: 34,
  /** Three rows of labels, so three Noten close together can each be named. */
  labelZone: 58,
  minHoldZone: 30,
  holdPadding: 8,
  minRadius: 2.5,
  /** A hair of air between two discs that touch. */
  contactGap: 0.6,
  contactTolerance: 0.05,
  rowRoom: 2,
  stackRoom: 0.9,
  emptyRoom: 2.4,
} as const;

export const discRadius = (point: RulerPoint, rFull: number): number =>
  point.kind === 'fach'
    ? rFull
    : Math.max(limits.minRadius, rFull * Math.sqrt(point.mass));

type Settling = { x: number; y: number; r: number };

/** How low a disc can drop before it rests on the bar or on a disc already there. */
const restOn = (disc: Settling, placed: ReadonlyArray<Settling>): number =>
  placed.reduce((y, other) => {
    const dx = Math.abs(disc.x - other.x);
    const reach = disc.r + other.r + limits.contactGap;
    return dx < reach - limits.contactTolerance
      ? Math.min(y, other.y - Math.sqrt(reach * reach - dx * dx))
      : y;
  }, -disc.r);

/**
 * Lets discs land in order: each one drops straight down until it rests on
 * the bar or on a disc that landed before it.
 */
export const settle = <Disc extends Settling>(
  discs: ReadonlyArray<Disc>,
): ReadonlyArray<Disc> => {
  const placed: Array<Disc> = [];
  for (const disc of discs) {
    placed.push({ ...disc, y: restOn(disc, placed) });
  }
  return placed;
};

/**
 * Lets discs land lowest first, whatever their order, so they make the
 * flattest pile. For discs that have no order of their own, such as the
 * Fächer of a Zeugnis.
 */
export const settleFlat = <Disc extends Settling>(
  discs: ReadonlyArray<Disc>,
): ReadonlyArray<Disc> => {
  const placed: Array<Disc> = [];
  let waiting = [...discs];
  while (waiting.length > 0) {
    const rests = waiting.map((candidate) => restOn(candidate, placed));
    const lowest = rests.indexOf(Math.max(...rests));
    const disc = waiting[lowest];
    if (disc !== undefined) {
      placed.push({ ...disc, y: rests[lowest] ?? -disc.r });
    }
    waiting = waiting.filter((_, index) => index !== lowest);
  }
  return placed;
};

const byDate = (a: RulerPoint, b: RulerPoint): number =>
  a.date.localeCompare(b.date);

type Frame = Pick<Geometry, 'variant' | 'x0' | 'pitch' | 'rFull'>;

/**
 * The discs that have a Note, resting on the bar. Noten land in the order of
 * their dates, so a new one never moves those that lie there already.
 */
export const landedPoints = (
  points: ReadonlyArray<RulerPoint>,
  scale: RulerScale,
  frame: Frame,
): ReadonlyArray<PlacedPoint> => {
  const dropped = points
    .filter((point) => point.value !== null)
    .sort(byDate)
    .map((point) => ({
      ...point,
      x: frame.x0 + scale.unitOf(point.value ?? 0) * frame.pitch,
      y: 0,
      r: discRadius(point, frame.rFull),
      waiting: false,
    }));
  return frame.variant === 'zeugnis' ? settleFlat(dropped) : settle(dropped);
};

/** The highest point any landed disc reaches, as a height above the bar. */
export const stackHeight = (placed: ReadonlyArray<PlacedPoint>): number =>
  placed
    .filter((point) => !point.waiting)
    .reduce((height, point) => Math.max(height, point.r - point.y), 0);

/**
 * How many units the bar of a phone's bench runs on beyond each end of its
 * scale. That bar may reach the edges of the screen, where a Note on the
 * first or the last value would be cut off. So the bar is longer than its
 * scale by what the largest disc reaches beyond the place of that value.
 */
const overhangUnits = (scale: RulerScale, radius: number): number => {
  const places = scale.steps.map((step) => scale.unitOf(step));
  const toEnd = Math.min(...places, scaleUnits - Math.max(...places));
  return Math.max(0, radius - toEnd);
};

export const measure = ({
  entering = false,
  hostWidth,
  model,
  scale,
  variant,
}: {
  /** A Note is being entered, so a disc without a value needs room to be held. */
  readonly entering?: boolean;
  readonly hostWidth: number;
  readonly model: RulerModel;
  readonly scale: RulerScale;
  readonly variant: RulerVariant;
}): Geometry => {
  const config = variants[variant];
  const width = Math.max(limits.minWidth, Math.floor(hostWidth));
  const phone = width < limits.phoneBelow;
  const holds = variant === 'bench' && phone;
  const gutter = holds ? 0 : config.gutter;
  const margin = gutter === 0 ? 0 : 1;
  const beyond = holds ? overhangUnits(scale, config.phoneRadius) : 0;
  const pitch = (width - gutter - 2 * margin) / (scaleUnits + 2 * beyond);
  const overhang = beyond * pitch;
  const x0 = margin + overhang;
  const rFull = phone
    ? Math.min(config.phoneRadiusCap, pitch * config.phoneRadius)
    : Math.min(config.radiusCap, pitch * config.radius);
  const beam = phone ? config.phoneBeam : config.beam;
  const labels = config.labels && pitch >= limits.labelsFromPitch;
  const waits = model.points.filter((point) => point.value === null);
  const holdZone =
    holds && (waits.length > 0 || entering)
      ? Math.max(
          limits.minHoldZone,
          ...waits.map(
            (point) => discRadius(point, rFull) * 2 + limits.holdPadding,
          ),
        )
      : 0;
  const stack = stackHeight(
    landedPoints(model.points, scale, { variant, x0, pitch, rFull }),
  );
  const room =
    variant === 'row'
      ? Math.max(stack, rFull * 2 + limits.rowRoom)
      : Math.max(stack + rFull * limits.stackRoom, rFull * limits.emptyRoom);
  const labelZone = labels ? limits.labelZone : 0;
  const beamY = Math.ceil(config.top + labelZone + holdZone + room);
  return {
    variant,
    width,
    height: beamY + beam + (phone ? config.phoneBelow : config.below),
    phone,
    x0,
    pitch,
    overhang,
    beam,
    beamY,
    rFull,
    gutter,
    holdZone,
    numerals: config.numerals,
    labels,
    top: config.top,
  };
};
