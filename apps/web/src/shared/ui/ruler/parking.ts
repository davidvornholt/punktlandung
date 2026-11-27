import { daysBetween } from '../../date/calendar-date.ts';
import {
  candidateId,
  discRadius,
  type Geometry,
  landedPoints,
  type PlacedPoint,
  type RulerPoint,
} from './geometry.ts';
import { type RulerScale, scaleUnits } from './scale.ts';

/** Where discs wait that have not landed, and with them the place of every disc. */

const parking = {
  rowMinRadius: 4.5,
  rowMaxRadius: 6.5,
  rowInset: 2,
  rowGap: 3,
  // The margin of a page on a phone: the bar runs from one edge of the screen to the other, and what waits above it ends where the page's text ends.
  phoneInset: 16,
  phoneGap: 8,
  gutterOffset: 4,
  gutterLift: 16,
  gutterMaxLift: 34,
  gutterPixelsPerDay: 1.6,
  gutterGap: 6,
  gutterLabelRoom: 34,
} as const;

const daysUntil = (today: string, date: string): number =>
  Math.max(0, daysBetween(today, date));

/**
 * In a row there is room for a mark, not for a figure: the discs wait in a
 * line behind the bar's end, small and level with it, the nearest first.
 */
const parkInRow = (
  waiting: ReadonlyArray<RulerPoint>,
  geometry: Geometry,
): ReadonlyArray<PlacedPoint> => {
  const start = geometry.x0 + scaleUnits * geometry.pitch + parking.rowGap;
  const end = geometry.width - parking.rowInset;
  const radii = waiting.map((point) =>
    Math.min(
      parking.rowMaxRadius,
      Math.max(parking.rowMinRadius, discRadius(point, geometry.rFull)),
    ),
  );
  const natural = radii.reduce((sum, r) => sum + r * 2 + parking.rowGap, 0);
  // More discs than the gutter holds move closer together and overlap.
  const squeeze = Math.min(1, (end - start) / Math.max(1, natural));
  let left = start;
  return waiting.map((point, index) => {
    const r = radii[index] ?? parking.rowMinRadius;
    const x = left + r;
    left += (r * 2 + parking.rowGap) * squeeze;
    return { ...point, x, y: geometry.beam / 2, r, waiting: true };
  });
};

const parkAbove = (
  waiting: ReadonlyArray<RulerPoint>,
  geometry: Geometry,
): ReadonlyArray<PlacedPoint> => {
  let right = geometry.width - parking.phoneInset;
  // What the disc being entered will count is written to its left. So it waits at the left end of the row, whatever its date, and the writing meets no other disc.
  const row = [
    ...waiting.filter((point) => point.id !== candidateId),
    ...waiting.filter((point) => point.id === candidateId),
  ];
  return row.map((point) => {
    const r = discRadius(point, geometry.rFull);
    const x = right - r;
    right = x - r - parking.phoneGap;
    return {
      ...point,
      x,
      y: geometry.top + geometry.holdZone / 2 - geometry.beamY,
      r,
      waiting: true,
    };
  });
};

const parkBeside = (
  waiting: ReadonlyArray<RulerPoint>,
  geometry: Geometry,
  today: string,
): ReadonlyArray<PlacedPoint> => {
  let top = geometry.beam;
  return waiting.map((point) => {
    const r = discRadius(point, geometry.rFull);
    const lift =
      point.state === 'missing'
        ? 0
        : parking.gutterLift +
          Math.min(
            parking.gutterMaxLift,
            daysUntil(today, point.date) * parking.gutterPixelsPerDay,
          );
    const y = Math.min(geometry.beam - r - lift, top - r - parking.gutterGap);
    top = y - r - parking.gutterLabelRoom;
    return {
      ...point,
      x:
        geometry.x0 +
        scaleUnits * geometry.pitch +
        geometry.gutter / 2 +
        parking.gutterOffset,
      y,
      r,
      waiting: true,
    };
  });
};

/**
 * Discs that have not landed are held off the bar. Beside it they hang lower
 * the nearer their date is, and a Note that is missing has come down to the
 * ground. Where there is no room beside the bar they wait in a row above its
 * right end.
 */
export const waitingPoints = (
  points: ReadonlyArray<RulerPoint>,
  geometry: Geometry,
  today: string,
): ReadonlyArray<PlacedPoint> => {
  const waiting = points
    .filter((point) => point.value === null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (geometry.variant === 'row') {
    return parkInRow(waiting, geometry);
  }
  return geometry.gutter === 0
    ? parkAbove(waiting, geometry)
    : parkBeside(waiting, geometry, today);
};

/**
 * The figure made tall enough for what waits beside the bar: a stack of
 * waiting discs can reach higher than the pile that has landed.
 */
export const withRoomFor = (
  geometry: Geometry,
  waiting: ReadonlyArray<PlacedPoint>,
): Geometry => {
  if (geometry.variant !== 'bench' || geometry.gutter === 0) {
    return geometry;
  }
  const reach = waiting.reduce(
    (most, point) =>
      Math.max(most, point.r - point.y + parking.gutterLabelRoom),
    0,
  );
  const lack = Math.ceil(reach + geometry.top - geometry.beamY);
  return lack > 0
    ? {
        ...geometry,
        beamY: geometry.beamY + lack,
        height: geometry.height + lack,
      }
    : geometry;
};

export const placePoints = (
  points: ReadonlyArray<RulerPoint>,
  scale: RulerScale,
  geometry: Geometry,
  today: string,
): ReadonlyArray<PlacedPoint> => [
  ...landedPoints(points, scale, geometry),
  ...waitingPoints(points, geometry, today),
];
