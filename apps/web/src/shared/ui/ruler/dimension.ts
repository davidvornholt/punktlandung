import { type Geometry, type PlacedPoint, tenths } from './geometry.ts';

/**
 * The lever arm of the disc a page is about: how far it lies from where the
 * Fach balances, drawn as a dimension line the way a textbook does.
 */

export type DimensionLine = {
  /** The dash-dotted axis through the fulcrum. */
  readonly axis: string;
  /** The extension line up from the disc. */
  readonly extension: string;
  readonly line: string;
  /** The two arrow heads, left out when the arm is too short for them. */
  readonly heads: string | null;
  readonly text: {
    readonly x: number;
    readonly y: number;
    readonly anchor: 'start' | 'end';
  };
};

const drawing = {
  aboveStack: 13,
  overshoot: 7,
  discGap: 3,
  textGap: 10,
  /** The width of one character of the text, estimated at 12.5 px bold. */
  character: 6.6,
  neighbourRoom: 12,
  minArmForHeads: 16,
  headLength: 6,
  headHalfWidth: 3,
  baselineShift: 4.5,
  minArm: 0.5,
} as const;

export const dimensionLine = ({
  focusId,
  fulcrumX,
  geometry,
  placed,
  text,
}: {
  readonly focusId: string;
  readonly fulcrumX: number;
  readonly geometry: Geometry;
  readonly placed: ReadonlyArray<PlacedPoint>;
  readonly text: string;
}): DimensionLine | null => {
  const landed = placed.filter((disc) => !disc.waiting);
  const point = landed.find((disc) => disc.id === focusId);
  if (
    point === undefined ||
    !geometry.labels ||
    Math.abs(point.x - fulcrumX) < drawing.minArm
  ) {
    return null;
  }
  const top = landed.reduce(
    (min, other) => Math.min(min, other.y - other.r),
    0,
  );
  const y = top - drawing.aboveStack;
  const from = point.x;
  const to = fulcrumX;
  const textWidth = text.length * drawing.character;
  // The text stands beside the line, on the side where no other disc's label line runs.
  const outward = to > from ? 1 : -1;
  const clear = (start: number, end: number): boolean =>
    start > 0 &&
    end < geometry.width &&
    !landed.some(
      (other) =>
        other.id !== point.id &&
        other.x + other.r + drawing.neighbourRoom > start &&
        other.x - drawing.neighbourRoom < end,
    );
  const span = (origin: number, towards: number): [number, number] =>
    towards === 1
      ? [origin + drawing.textGap, origin + drawing.textGap + textWidth]
      : [origin - drawing.textGap - textWidth, origin - drawing.textGap];
  const atFulcrum =
    clear(...span(to, outward)) || !clear(...span(from, -outward));
  const direction = atFulcrum ? outward : -outward;
  const head = (x: number, towards: number): string =>
    `M${tenths(x)} ${tenths(y)}l${towards * drawing.headLength} ${-drawing.headHalfWidth}v${drawing.headHalfWidth * 2}z`;
  return {
    axis: `M${tenths(to)} ${geometry.beam}V${tenths(y - drawing.overshoot)}`,
    extension: `M${tenths(from)} ${tenths(point.y - point.r - drawing.discGap)}V${tenths(y - drawing.overshoot)}`,
    line: `M${tenths(from)} ${tenths(y)}H${tenths(to)}`,
    heads:
      Math.abs(to - from) > drawing.minArmForHeads
        ? `${head(from, outward)}${head(to, -outward)}`
        : null,
    text: {
      x: tenths((atFulcrum ? to : from) + direction * drawing.textGap),
      y: tenths(y + drawing.baselineShift),
      anchor: direction === 1 ? 'start' : 'end',
    },
  };
};
