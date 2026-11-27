import { tenths } from './geometry.ts';
import { type RulerScale, scaleUnits } from './scale.ts';

const numeralSize = { wide: 15, medium: 13, narrow: 10.5, tight: 9.5 } as const;
const gradeSize = { wide: 10.5, narrow: 9 } as const;
const pitchFor = {
  wide: 52,
  medium: 36,
  narrow: 23,
  everyNumeral: 19,
} as const;
/** Where the two rows of figures stand, as fractions of the bar's height. */
const baseline = { numerals: 0.56, numeralsAlone: 0.66, grades: 0.9 } as const;

const sizeOfNumerals = (pitch: number): number => {
  if (pitch >= pitchFor.wide) {
    return numeralSize.wide;
  }
  if (pitch >= pitchFor.medium) {
    return numeralSize.medium;
  }
  return pitch >= pitchFor.narrow ? numeralSize.narrow : numeralSize.tight;
};

/**
 * The bar itself. With numerals it carries its graduation like a ruler with
 * two edges: the scale's own figures along the top and, on a Notenpunkte bar,
 * the Noten 6 to 1 along the bottom. Its figures are decoration to a screen
 * reader: what the bar says is said by the figure's name and by the discs.
 */
export const RulerBar = ({
  height,
  numerals,
  overhang = 0,
  pitch,
  scale,
  x0,
  y = 0,
}: {
  readonly height: number;
  readonly numerals: boolean;
  /** How far the bar runs on beyond each end of its scale. */
  readonly overhang?: number;
  /** The width of one of the bar's 16 units. */
  readonly pitch: number;
  readonly scale: RulerScale;
  /** Where the scale begins. */
  readonly x0: number;
  readonly y?: number;
}) => {
  const left = tenths(x0 - overhang);
  const width = tenths(pitch * scaleUnits + 2 * overhang);
  const at = (unit: number): number => tenths(x0 + unit * pitch);
  // The first and the last block of the scale reach to the ends of the bar.
  const edgeAt = (unit: number): number => {
    if (unit <= 0) {
      return left;
    }
    return unit >= scaleUnits ? tenths(left + width) : at(unit);
  };
  const ticks = (numerals ? scale.ticks(pitch) : scale.rowTicks)
    .map(
      (tick) =>
        `M${at(tick.unit)} ${tenths(y + tick.from * height)}V${tenths(y + tick.to * height)}`,
    )
    .join('');
  const numeralBaseline =
    scale.grades.length === 0 ? baseline.numeralsAlone : baseline.numerals;
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: An SVG group cannot take focus; the rule mistakes it for an element that can. It holds only the bar's decoration.
    <g aria-hidden="true">
      <rect
        data-part="ruler-body"
        height={height}
        width={width}
        x={left}
        y={y}
      />
      {scale.bands
        .filter((band) => band.shaded)
        .map((band) => (
          <rect
            data-part="ruler-band"
            height={height}
            key={band.from}
            width={tenths(edgeAt(band.to) - edgeAt(band.from))}
            x={edgeAt(band.from)}
            y={y}
          />
        ))}
      <path data-part="ruler-ticks" d={ticks} />
      {numerals
        ? scale.numerals
            .filter(
              (numeral) => numeral.major || pitch >= pitchFor.everyNumeral,
            )
            .map((numeral) => (
              <text
                data-part="ruler-numeral"
                fontSize={sizeOfNumerals(pitch)}
                key={numeral.unit}
                x={at(numeral.unit)}
                y={tenths(y + height * numeralBaseline)}
              >
                {numeral.text}
              </text>
            ))
        : null}
      {numerals
        ? scale.grades.map((grade) => (
            <text
              data-part="ruler-grade"
              fontSize={
                pitch >= pitchFor.medium ? gradeSize.wide : gradeSize.narrow
              }
              key={grade.unit}
              x={at(grade.unit)}
              y={tenths(y + height * baseline.grades)}
            >
              {grade.text}
            </text>
          ))
        : null}
      <rect
        data-part="ruler-rim"
        height={height}
        width={width}
        x={left}
        y={y}
      />
    </g>
  );
};
