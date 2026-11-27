import type { Notensystem } from '../../noten/notenwert.ts';
import { formatNote } from '../../noten/zeugnisnote.ts';

/**
 * The bar is 16 units long whatever it measures. In the Punktesystem one unit
 * is one Notenpunkt; the Sechsersystem lays its quarter steps over the same
 * length. Both maps are linear, so the place where the discs balance is the
 * place of their weighted mean.
 */
export const scaleUnits = 16;

export type ScaleBand = {
  readonly from: number;
  readonly to: number;
  /** Every second Note is shaded, so the blocks can be told apart. */
  readonly shaded: boolean;
};

export type ScaleNumeral = {
  readonly unit: number;
  readonly text: string;
  /** Shown even when the bar is too short for every numeral. */
  readonly major: boolean;
};

export type ScaleTick = {
  readonly unit: number;
  /** Where the tick starts and ends, as fractions of the bar's height. */
  readonly from: number;
  readonly to: number;
};

export type RulerScale = {
  readonly system: Notensystem;
  /** The values a Note can take, from the bar's left end to its right. */
  readonly steps: ReadonlyArray<number>;
  readonly unitOf: (value: number) => number;
  readonly valueOf: (unit: number) => number;
  readonly bands: ReadonlyArray<ScaleBand>;
  /** The graduation along the top edge. */
  readonly numerals: ReadonlyArray<ScaleNumeral>;
  /** The Noten 6 to 1 along the bottom edge of a Notenpunkte bar. */
  readonly grades: ReadonlyArray<ScaleNumeral>;
  /** Ticks of the big bar, finer the more room one unit has. */
  readonly ticks: (pitch: number) => ReadonlyArray<ScaleTick>;
  /** Ticks of the thin bar in a row, which carries no numerals. */
  readonly rowTicks: ReadonlyArray<ScaleTick>;
};

const tick = {
  whole: 0.24,
  half: 0.15,
  fine: 0.085,
  boundaryFrom: 0.7,
  rowMajor: 0.62,
  rowMinor: 0.36,
} as const;

const pitchFor = { tenths: 52, halves: 30 } as const;

const epsilon = 1e-6;
const isMultiple = (value: number, of: number): boolean =>
  Math.abs(value / of - Math.round(value / of)) < epsilon;

const maxNotenpunkte = 15;
const majorEvery = 5;
const halfUnit = 0.5;
const tenth = 0.1;
const worstNote = 6;
const bestNote = 1;

/** Notenstufen as blocks of the bar: 0 P. is Note 6, then three Notenpunkte per Note. */
const punkteBlocks = [
  { note: 6, from: 0, to: 1 },
  { note: 5, from: 1, to: 4 },
  { note: 4, from: 4, to: 7 },
  { note: 3, from: 7, to: 10 },
  { note: 2, from: 10, to: 13 },
  { note: 1, from: 13, to: 16 },
] as const;

const isOdd = (value: number): boolean => value % 2 === 1;

const topTick = (unit: number, length: number): ScaleTick => ({
  unit,
  from: 0,
  to: length,
});

const boundaryTick = (unit: number): ScaleTick => ({
  unit,
  from: tick.boundaryFrom,
  to: 1,
});

const punkteStep = (pitch: number): number => {
  if (pitch >= pitchFor.tenths) {
    return tenth;
  }
  return pitch >= pitchFor.halves ? halfUnit : 1;
};

const punkteTickLength = (value: number): number => {
  if (isMultiple(value, 1)) {
    return tick.whole;
  }
  return isMultiple(value, halfUnit) ? tick.half : tick.fine;
};

const punkteTicks = (pitch: number): ReadonlyArray<ScaleTick> => {
  const step = punkteStep(pitch);
  const count = Math.round(maxNotenpunkte / step);
  const graduation = Array.from({ length: count + 1 }, (_, index) => {
    const value = index * step;
    return topTick(value + halfUnit, punkteTickLength(value));
  });
  return [
    ...graduation,
    ...punkteBlocks.slice(1).map((block) => boundaryTick(block.from)),
  ];
};

const punkteValues = Array.from(
  { length: maxNotenpunkte + 1 },
  (_, value) => value,
);

export const punkteScale: RulerScale = {
  system: 'punkte',
  steps: punkteValues,
  unitOf: (value) => value + halfUnit,
  valueOf: (unit) => unit - halfUnit,
  bands: punkteBlocks.map((block) => ({
    from: block.from,
    to: block.to,
    shaded: isOdd(block.note),
  })),
  numerals: punkteValues.map((value) => ({
    unit: value + halfUnit,
    text: `${value}`,
    major: value % majorEvery === 0,
  })),
  grades: punkteBlocks.map((block) => ({
    unit: (block.from + block.to) / 2,
    text: `${block.note}`,
    major: true,
  })),
  ticks: punkteTicks,
  rowTicks: punkteValues.map((value) =>
    topTick(
      value + halfUnit,
      value % majorEvery === 0 ? tick.rowMajor : tick.rowMinor,
    ),
  ),
};

/*
 * The Sechsersystem runs from 6 on the left to 1 on the right, so better is
 * to the right on both bars. A Note is entered in quarter steps; each of the
 * 21 steps gets a slot of the same width.
 */
const quartersPerNote = 4;
const sechserSlots = (worstNote - bestNote) * quartersPerNote + 1;
const slot = scaleUnits / sechserSlots;
const quarter = 0.25;

const sechserUnit = (note: number): number =>
  ((worstNote - note) * quartersPerNote + halfUnit) * slot;

const sechserValues = Array.from(
  { length: sechserSlots },
  (_, index) => worstNote - index * quarter,
);

const wholeNoten = Array.from(
  { length: worstNote - bestNote + 1 },
  (_, index) => worstNote - index,
);

/** A Note's block ends where rounding to a whole Note changes: at the ,5 values. */
const blockEdge = (note: number, side: 'worse' | 'better'): number => {
  if (side === 'worse') {
    return note === worstNote ? 0 : sechserUnit(note + halfUnit);
  }
  return note === bestNote ? scaleUnits : sechserUnit(note - halfUnit);
};

const sechserTickLength = (note: number): number => {
  if (isMultiple(note, 1)) {
    return tick.whole;
  }
  return isMultiple(note, halfUnit) ? tick.half : tick.fine;
};

const sechserTicks = (pitch: number): ReadonlyArray<ScaleTick> => {
  const fine = pitch >= pitchFor.halves;
  return [
    ...sechserValues
      .filter((note) => fine || isMultiple(note, halfUnit))
      .map((note) => topTick(sechserUnit(note), sechserTickLength(note))),
    ...wholeNoten
      .slice(1)
      .map((note) => boundaryTick(blockEdge(note, 'worse'))),
  ];
};

export const sechserScale: RulerScale = {
  system: 'sechser',
  steps: sechserValues,
  unitOf: sechserUnit,
  valueOf: (unit) => worstNote - (unit / slot - halfUnit) / quartersPerNote,
  bands: wholeNoten.map((note) => ({
    from: blockEdge(note, 'worse'),
    to: blockEdge(note, 'better'),
    shaded: isOdd(note),
  })),
  numerals: wholeNoten.map((note) => ({
    unit: sechserUnit(note),
    text: `${note}`,
    major: true,
  })),
  grades: [],
  ticks: sechserTicks,
  rowTicks: sechserValues
    .filter((note) => isMultiple(note, halfUnit))
    .map((note) =>
      topTick(
        sechserUnit(note),
        isMultiple(note, 1) ? tick.rowMajor : tick.rowMinor,
      ),
    ),
};

export const scaleFor = (system: Notensystem): RulerScale =>
  system === 'punkte' ? punkteScale : sechserScale;

/** The step nearest to a place on the bar, for a pointer that picks a Note. */
export const nearestStep = (scale: RulerScale, unit: number): number => {
  const [first] = scale.steps;
  let nearest = first ?? 0;
  for (const step of scale.steps) {
    if (
      Math.abs(scale.unitOf(step) - unit) <
      Math.abs(scale.unitOf(nearest) - unit)
    ) {
      nearest = step;
    }
  }
  return nearest;
};

const movingFactor = 10;

/**
 * The figure under the fulcrum. While the fulcrum is still moving it keeps one
 * decimal, so the text does not change its width on every frame. At rest it
 * prints `exact`, the Schnitt the fulcrum was sent to, as it was given: a
 * place on the bar converted back into a value can differ in the last digit
 * ("2,87" for 2,875), and the figure must be the one the rest of the page
 * shows. `exact` is ignored while the fulcrum rests somewhere else.
 *
 * The fulcrum creeps the last hundredth of its way for about half a second
 * after it looks still. The figure does not wait for that: as soon as the
 * place it stands on prints the same as `exact`, it prints that.
 */
export const formatFulcrum = (
  scale: RulerScale,
  unit: number,
  resting: boolean,
  exact: number | null = null,
): string => {
  if (resting) {
    const given =
      exact !== null && Math.abs(scale.unitOf(exact) - unit) < epsilon;
    return formatNote(given ? exact : scale.valueOf(unit), scale.system);
  }
  const here = formatNote(scale.valueOf(unit), scale.system);
  if (exact !== null && here === formatNote(exact, scale.system)) {
    return here;
  }
  const figure = (Math.round(scale.valueOf(unit) * movingFactor) / movingFactor)
    .toFixed(1)
    .replace('.', ',');
  return scale.system === 'punkte' ? `${figure} P.` : figure;
};
