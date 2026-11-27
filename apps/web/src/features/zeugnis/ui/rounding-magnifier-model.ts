import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { tenths } from '#/shared/ui/ruler/geometry.ts';
import {
  type RulerScale,
  scaleFor,
  scaleUnits,
} from '#/shared/ui/ruler/scale.ts';

/**
 * A piece of the bar under a magnifier: where the Fachschnitt lies and the
 * mark it is rounded to. It draws the rounding the Zeugnis has done; it does
 * not round anything itself.
 */

const glass = {
  wide: { width: 132, pitch: 62 },
  narrow: { width: 104, pitch: 48 },
  height: 34,
  barTop: 14,
  barHeight: 16,
  /** How much of the bar is seen to either side of the mark, in steps of the Halbjahresnote. */
  reach: 0.95,
  /** Two places along the bar closer than this are the same place. */
  same: 0.001,
  /** The marks that end one step and begin the next lie half a step from the mark. */
  boundary: 0.5,
  boundsTop: 3,
  boundsBottom: 30,
  dotY: 7,
  dotRadius: 3.6,
  /** The arrowhead shrinks with the room between the dot and the mark; below `minLength` there is no arrow. */
  head: { length: 6, minLength: 3, half: 3.2, overlap: 1 },
  tick: { mark: 9, boundary: 6, fine: 3.5 },
} as const;

/** The graduation between two marks: tenths of a Notenpunkt, twentieths of a Note. */
const partsOfStep = { punkte: 10, sechser: 5 } as const;

export type Magnifier = {
  readonly width: number;
  readonly height: number;
  readonly bar: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly ticks: string;
  /** The places where rounding changes to the next mark: two, or one at an end of the bar. */
  readonly bounds: string;
  readonly dot: { readonly x: number; readonly y: number; readonly r: number };
  /** The way from the Fachschnitt to the mark; `null` when the dot lies on the mark or touches it. */
  readonly arrow: { readonly line: string; readonly head: string } | null;
};

/**
 * What the glass can show to either side of the mark, in steps. The bar ends
 * half a step beyond its first and its last mark, and its graduation ends at
 * those marks, so at 15 P. or at a 6 the glass shows the end of the bar
 * instead of a piece that does not exist.
 */
type Room = {
  readonly bar: { readonly left: number; readonly right: number };
  readonly ticks: { readonly left: number; readonly right: number };
};

const roomAround = (
  scale: RulerScale,
  mark: number,
  unitsPerStep: number,
): Room => {
  const unit = scale.unitOf(mark);
  const first = scale.unitOf(scale.steps.at(0) ?? mark);
  const last = scale.unitOf(scale.steps.at(-1) ?? mark);
  return {
    bar: {
      left: Math.min(glass.reach, unit / unitsPerStep),
      right: Math.min(glass.reach, (scaleUnits - unit) / unitsPerStep),
    },
    ticks: {
      left: (unit - first) / unitsPerStep + glass.same,
      right: (last - unit) / unitsPerStep + glass.same,
    },
  };
};

const tickLength = (step: number, parts: number): number => {
  if (step === 0) {
    return glass.tick.mark;
  }
  return Math.abs(step) / parts === glass.boundary
    ? glass.tick.boundary
    : glass.tick.fine;
};

const ticksPath = (
  centre: number,
  pitch: number,
  parts: number,
  room: Room['ticks'],
): string =>
  Array.from({ length: 2 * parts - 1 }, (_, index) => index - parts + 1)
    .filter((step) => step / parts >= -room.left && step / parts <= room.right)
    .map(
      (step) =>
        `M${tenths(centre + (step / parts) * pitch)} ${glass.barTop}v${tickLength(step, parts)}`,
    )
    .join('');

/** The places where rounding changes to the next mark; beyond the end of the bar there is none. */
const boundsPath = (centre: number, pitch: number, room: Room['bar']): string =>
  [
    room.left > glass.boundary + glass.same ? -glass.boundary : null,
    room.right > glass.boundary + glass.same ? glass.boundary : null,
  ]
    .filter((offset) => offset !== null)
    .map(
      (offset) =>
        `M${tenths(centre + offset * pitch)} ${glass.boundsTop}V${glass.boundsBottom}`,
    )
    .join('');

const arrowTo = (centre: number, from: number): Magnifier['arrow'] => {
  const room = Math.abs(centre - from) - glass.dotRadius;
  if (room < glass.head.minLength) {
    return null;
  }
  const direction = from < centre ? 1 : -1;
  const length = Math.min(glass.head.length, room);
  const half = (glass.head.half * length) / glass.head.length;
  const lineEnd = centre - direction * (length - glass.head.overlap);
  return {
    line: `M${tenths(from)} ${glass.dotY}H${tenths(lineEnd)}`,
    head: `M${tenths(centre)} ${glass.dotY}l${tenths(-direction * length)} ${tenths(-half)}v${tenths(2 * half)}z`,
  };
};

export const magnifier = ({
  halbjahresnote,
  narrow,
  schnitt,
  system,
}: {
  /** The mark the Fachschnitt is rounded to. */
  readonly halbjahresnote: number;
  readonly narrow: boolean;
  /** The unrounded Fachschnitt. */
  readonly schnitt: number;
  readonly system: Notensystem;
}): Magnifier => {
  const { width, pitch } = narrow ? glass.narrow : glass.wide;
  const centre = width / 2;
  const scale = scaleFor(system);
  const [first = 0, second = 1] = scale.steps;
  // Better is to the right on every bar, so it is here too.
  const unitsPerStep = scale.unitOf(second) - scale.unitOf(first);
  const steps =
    (scale.unitOf(schnitt) - scale.unitOf(halbjahresnote)) / unitsPerStep;
  const from = Math.max(
    glass.dotRadius,
    Math.min(width - glass.dotRadius, centre + steps * pitch),
  );
  const room = roomAround(scale, halbjahresnote, unitsPerStep);
  return {
    width,
    height: glass.height,
    bar: {
      x: tenths(centre - room.bar.left * pitch),
      y: glass.barTop,
      width: tenths((room.bar.left + room.bar.right) * pitch),
      height: glass.barHeight,
    },
    ticks: ticksPath(centre, pitch, partsOfStep[system], room.ticks),
    bounds: boundsPath(centre, pitch, room.bar),
    dot: { x: tenths(from), y: glass.dotY, r: glass.dotRadius },
    arrow: arrowTo(centre, from),
  };
};
