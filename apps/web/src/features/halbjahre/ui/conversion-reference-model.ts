import { conversionTable } from '#/shared/noten/conversion-table.ts';
import { tenths } from '#/shared/ui/ruler/geometry.ts';
import { scaleFor, scaleUnits } from '#/shared/ui/ruler/scale.ts';

/**
 * Where the two bars of the figure "Zwei Skalen, eine Richtung" lie, and
 * where the Notenpunkte stand on the bar of Noten. The conversion itself is
 * read off `conversionTable`; nothing is converted here.
 */

const bar = {
  /** Room for the rim, which is drawn half outside the bar. */
  inset: 1,
  height: 52,
  minWidth: 240,
  /** Below this a unit is too short for a figure under every Notentendenz. */
  everyMarkFromPitch: 30,
  /** Where the figures of the lower edge stand, as a fraction of the bar's height. */
  markBaseline: 0.91,
  markSize: { wide: 10.5, narrow: 9 },
  wideFromPitch: 36,
} as const;

export type ScaleBar = {
  /** The size of the drawing; the bar lies inside it, inset by its rim. */
  readonly width: number;
  readonly height: number;
  readonly x0: number;
  readonly y: number;
  readonly barHeight: number;
  /** The width of one of the bar's 16 units. */
  readonly pitch: number;
};

export const scaleBar = (hostWidth: number): ScaleBar => {
  const width = Math.max(bar.minWidth, Math.floor(hostWidth));
  return {
    width,
    height: bar.height + 2 * bar.inset,
    x0: bar.inset,
    y: bar.inset,
    barHeight: bar.height,
    pitch: (width - 2 * bar.inset) / scaleUnits,
  };
};

export type EdgeMark = {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly text: string;
};

const noten = scaleFor('sechser');

/**
 * The Notenpunkte along the lower edge of the bar of Noten: each stands
 * under the Notentendenz it is officially given for. The values between
 * them are the app's own and stay off the bar. A short bar names only the
 * Notenpunkte of the whole Noten.
 */
export const notenpunkteMarks = (frame: ScaleBar): ReadonlyArray<EdgeMark> =>
  conversionTable
    // 1+ is better than any Note of this bar, so it has no place on it.
    .filter((row) => row.tendenz && noten.steps.includes(row.note))
    .filter(
      (row) =>
        frame.pitch >= bar.everyMarkFromPitch || Number.isInteger(row.note),
    )
    .map((row) => ({
      x: tenths(frame.x0 + noten.unitOf(row.note) * frame.pitch),
      y: tenths(frame.y + frame.barHeight * bar.markBaseline),
      size:
        frame.pitch >= bar.wideFromPitch
          ? bar.markSize.wide
          : bar.markSize.narrow,
      text: `${row.notenpunkte}`,
    }));
