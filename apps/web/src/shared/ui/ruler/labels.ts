import { type Geometry, type PlacedPoint, tenths } from './geometry.ts';

/**
 * Figure labels with leader lines, as in a textbook drawing. A label names
 * the disc it points at; up to three rows keep labels of discs that lie close
 * together from running into each other.
 */

export type FigureLabel = {
  /** The disc the label names. */
  readonly id: string;
  readonly focus: boolean;
  readonly lines: ReadonlyArray<string>;
  readonly x: number;
  /** The baseline of the first line. */
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  /** The path of the leader line, when the label stands apart from its disc. */
  readonly leader: string | null;
};

const layout = {
  rows: 3,
  firstRow: 12,
  rowHeight: 17,
  /** Half the width of a label, estimated from its length at 12.5 px. */
  halfCharacter: 3.5,
  halfPadding: 6,
  gapInRow: 6,
  gapAcrossRows: 4,
  crossingGap: 3,
  sideStep: 5,
  leaderStart: 5,
  leaderEnd: 3,
  elbowOffset: 7,
  elbowGap: 2,
  waitingGap: 9,
  lineHeight: 14,
  heldGap: 8,
  baselineShift: 4.5,
} as const;

type Side = -1 | 0 | 1;

/** A label that has its place: where its text is centred and where its leader line runs. */
type Slot = {
  readonly centre: number;
  readonly half: number;
  readonly lx: number;
};

type Place = {
  readonly row: number;
  readonly side: Side;
  readonly centre: number;
};

/** A label is centred over its leader line, or steps to one side of it. */
const sides: ReadonlyArray<Side> = [0, 1, -1];

const anchors = { '-1': 'end', '0': 'middle', '1': 'start' } as const;

type Wanted = {
  readonly point: PlacedPoint;
  readonly text: string;
  readonly half: number;
  /** Where the leader line leaves the label row. */
  readonly lx: number;
  /** The disc lies under another one, so its leader line passes the stack with an elbow. */
  readonly elbow: boolean;
  /** The top of the stack the disc lies in. */
  readonly stackTop: number;
};

/** What each disc would like as a label, worked out column by column. */
const wantedLabels = (
  placed: ReadonlyArray<PlacedPoint>,
): ReadonlyArray<Wanted> => {
  const items = placed
    .filter((point) => !point.waiting && point.note !== undefined)
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const stackTop = new Map<number, number>();
  for (const point of items) {
    const key = Math.round(point.x);
    stackTop.set(
      key,
      Math.min(
        stackTop.get(key) ?? Number.POSITIVE_INFINITY,
        point.y - point.r,
      ),
    );
  }
  const widestAbove = new Map<number, number>();
  return items.map((point) => {
    const key = Math.round(point.x);
    const widest = widestAbove.get(key);
    widestAbove.set(key, Math.max(widest ?? 0, point.r));
    const text = point.note ?? '';
    return {
      point,
      text,
      half: text.length * layout.halfCharacter + layout.halfPadding,
      // The top disc of a stack is labelled straight from above; one below it gets an elbow that passes the stack.
      lx:
        widest === undefined
          ? point.x
          : point.x + Math.max(widest, point.r) + layout.elbowOffset,
      elbow: widest !== undefined,
      stackTop: stackTop.get(key) ?? 0,
    };
  });
};

/** Whether a label can stand at a place without touching a label or crossing a leader line. */
const isClear = ({
  place,
  rows,
  wanted,
  width,
}: {
  readonly place: Place;
  readonly rows: ReadonlyArray<ReadonlyArray<Slot>>;
  readonly wanted: Wanted;
  readonly width: number;
}): boolean => {
  const { half, lx } = wanted;
  const inside = place.centre - half >= 0 && place.centre + half <= width;
  const besideOthers = (rows[place.row] ?? []).every(
    (slot) =>
      Math.abs(slot.centre - place.centre) > slot.half + half + layout.gapInRow,
  );
  // Its own leader line runs down through the rows below it.
  const pastLabelsBelow = rows
    .slice(place.row + 1)
    .flat()
    .every(
      (slot) => Math.abs(slot.centre - lx) > slot.half + layout.gapAcrossRows,
    );
  // The leader lines of the rows above run down through its row.
  const pastLeadersAbove = rows
    .slice(0, place.row)
    .flat()
    .every(
      (slot) =>
        slot.lx === lx ||
        Math.abs(slot.lx - place.centre) > half + layout.crossingGap,
    );
  return inside && besideOthers && pastLabelsBelow && pastLeadersAbove;
};

const findPlace = (
  rows: ReadonlyArray<ReadonlyArray<Slot>>,
  wanted: Wanted,
  width: number,
): Place | null => {
  for (const row of rows.keys()) {
    for (const side of sides) {
      const place = {
        row,
        side,
        centre: wanted.lx + side * (wanted.half - layout.sideStep),
      };
      if (isClear({ place, rows, wanted, width })) {
        return place;
      }
    }
  }
  return null;
};

const drawLabel = (
  wanted: Wanted,
  place: Place,
  geometry: Geometry,
): FigureLabel => {
  const { lx, point } = wanted;
  const y =
    geometry.top +
    layout.firstRow +
    place.row * layout.rowHeight -
    geometry.beamY;
  const start = y + layout.leaderStart;
  return {
    id: point.id,
    focus: point.focus === true,
    lines: [wanted.text],
    x: tenths(lx - place.side * layout.sideStep),
    y: tenths(y),
    anchor: anchors[place.side],
    leader: wanted.elbow
      ? `M${tenths(lx)} ${tenths(start)}V${tenths(point.y)}H${tenths(point.x + point.r + layout.elbowGap)}`
      : `M${tenths(lx)} ${tenths(start)}V${tenths(Math.max(start, wanted.stackTop - layout.leaderEnd))}`,
  };
};

/**
 * Labels are placed from left to right, after the one for the disc the page
 * is about. A label that would touch another one or cross a leader line is
 * left out: a crowded figure names fewer discs rather than printing labels
 * over each other, and every disc still says what it is when pointed at.
 */
const landedLabels = (
  placed: ReadonlyArray<PlacedPoint>,
  geometry: Geometry,
): ReadonlyArray<FigureLabel> => {
  const wanted = wantedLabels(placed);
  const inOrder = [
    ...wanted.filter((label) => label.point.focus === true),
    ...wanted.filter((label) => label.point.focus !== true),
  ];
  const rows: Array<Array<Slot>> = Array.from(
    { length: layout.rows },
    () => [],
  );
  const labels: Array<FigureLabel> = [];
  for (const label of inOrder) {
    const place = findPlace(rows, label, geometry.width);
    if (place !== null) {
      rows[place.row]?.push({
        centre: place.centre,
        half: label.half,
        lx: label.lx,
      });
      labels.push(drawLabel(label, place, geometry));
    }
  }
  return labels;
};

/** A disc that waits beside the bar is named in two lines above it. */
const waitingLabels = (
  placed: ReadonlyArray<PlacedPoint>,
): ReadonlyArray<FigureLabel> =>
  placed
    .filter((point) => point.waiting && point.note !== undefined)
    .map((point) => {
      const lines = (point.note ?? '').split('\n');
      return {
        id: point.id,
        focus: point.focus === true,
        lines,
        x: tenths(point.x),
        y: tenths(
          point.y -
            point.r -
            layout.waitingGap -
            (lines.length - 1) * layout.lineHeight,
        ),
        anchor: 'middle',
        leader: null,
      };
    });

/** Where there is no room for labels, only the row of held discs gets a word. */
const heldSummary = (
  placed: ReadonlyArray<PlacedPoint>,
): ReadonlyArray<FigureLabel> => {
  const held = placed.filter(
    (point) => point.waiting && point.note !== undefined,
  );
  const [first] = held;
  if (first === undefined) {
    return [];
  }
  const left = Math.min(...held.map((point) => point.x - point.r));
  return [
    {
      id: first.id,
      focus: held.some((point) => point.focus === true),
      lines: [
        held.length === 1
          ? (first.note ?? '').replace('\n', ' · ')
          : `${held.length} ausstehend`,
      ],
      x: tenths(left - layout.heldGap),
      y: tenths(first.y + layout.baselineShift),
      anchor: 'end',
      leader: null,
    },
  ];
};

export const labelLineHeight = layout.lineHeight;

export const figureLabels = (
  placed: ReadonlyArray<PlacedPoint>,
  geometry: Geometry,
): ReadonlyArray<FigureLabel> => {
  if (geometry.labels) {
    return [...landedLabels(placed, geometry), ...waitingLabels(placed)];
  }
  return geometry.variant === 'bench' && geometry.gutter === 0
    ? heldSummary(placed)
    : [];
};
