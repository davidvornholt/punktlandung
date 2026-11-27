import type { RefObject } from 'react';
import type { HeldDisc, RulerCandidate } from './candidate.ts';
import { dimensionLine } from './dimension.ts';
import { discLook, flag } from './disc-look.ts';
import {
  type Geometry,
  type PlacedPoint,
  type RulerVariant,
  tenths,
} from './geometry.ts';
import { type FigureLabel, labelLineHeight } from './labels.ts';

/** Where the value and its caption stand under the fulcrum, and how big the value is. */
const fulcrumText = {
  bench: { valueY: 47, captionY: 62 },
  zeugnis: { valueY: 84, captionY: 106, size: 60 },
  zeugnisPhone: { valueY: 70, captionY: 90, size: 44 },
} as const;

/**
 * The wedge the bar rests on, with the Schnitt written under it. The balance
 * moves the group and fills in the two texts; see `useFulcrumPaint`.
 */
export const Fulcrum = ({
  captionRef,
  phone,
  valueRef,
  variant,
}: {
  readonly captionRef: RefObject<SVGTextElement | null>;
  readonly phone: boolean;
  readonly valueRef: RefObject<SVGTextElement | null>;
  readonly variant: RulerVariant;
}) => {
  if (variant === 'row') {
    return <path data-part="fulcrum-body" d="M0 0l5.5 9.5h-11z" />;
  }
  const big = phone ? fulcrumText.zeugnisPhone : fulcrumText.zeugnis;
  return (
    <>
      <path data-part="fulcrum-body" d="M0 0l11 18h-22z" />
      <path data-part="fulcrum-ground" d="M-24 19h48" />
      <path
        data-part="fulcrum-hatch"
        d="M-18 19l-6 6M-10 19l-6 6M-2 19l-6 6M6 19l-6 6M14 19l-6 6"
      />
      {variant === 'zeugnis' ? (
        <>
          <text
            data-part="fulcrum-value-big"
            fontSize={big.size}
            ref={valueRef}
            y={big.valueY}
          />
          <text data-part="fulcrum-caption" ref={captionRef} y={big.captionY} />
        </>
      ) : (
        <>
          <text
            data-part="fulcrum-value"
            ref={valueRef}
            y={fulcrumText.bench.valueY}
          />
          <text
            data-part="fulcrum-caption"
            ref={captionRef}
            y={fulcrumText.bench.captionY}
          />
        </>
      )}
    </>
  );
};

export const FigureLabels = ({
  highlightId,
  labels,
}: {
  readonly highlightId: string | null;
  readonly labels: ReadonlyArray<FigureLabel>;
}) =>
  labels.map((label) => {
    const [first, second] = label.lines;
    return (
      <g
        data-part="figure-label"
        data-focus={flag(label.focus)}
        data-hover={flag(label.id === highlightId)}
        key={label.id}
      >
        {label.leader === null ? null : (
          <path data-part="figure-label-line" d={label.leader} />
        )}
        <text
          data-part="figure-label-text"
          textAnchor={label.anchor}
          x={label.x}
          y={label.y}
        >
          <tspan x={label.x}>{first}</tspan>
          {second === undefined ? null : (
            <tspan dy={labelLineHeight} x={label.x}>
              {second}
            </tspan>
          )}
        </text>
      </g>
    );
  });

/** The lever arm of one disc to the fulcrum; nothing where the figure has no room for it. */
export const Dimension = ({
  text,
  ...arm
}: {
  readonly focusId: string;
  readonly fulcrumX: number;
  readonly geometry: Geometry;
  readonly placed: ReadonlyArray<PlacedPoint>;
  readonly text: string;
}) => {
  const line = dimensionLine({ ...arm, text });
  if (line === null) {
    return null;
  }
  return (
    <g>
      <path d={line.axis} data-part="dimension-axis" />
      <path d={line.extension} data-part="dimension-ext" />
      <path d={line.line} data-part="dimension-line" />
      {line.heads === null ? null : (
        <path d={line.heads} data-part="dimension-head" />
      )}
      <text
        data-part="dimension-text"
        textAnchor={line.text.anchor}
        x={line.text.x}
        y={line.text.y}
      >
        {text}
      </text>
    </g>
  );
};

const heldText = {
  besideGap: 7,
  baselineShift: 4.5,
  aboveGap: 8,
  /** Half the width of one character at 13.5 px bold, to keep the text on the sheet. */
  halfCharacter: 4.1,
  padding: 2,
} as const;

const plumb = { fromGap: 3, toGap: 2, minLength: 4 } as const;

/**
 * The disc that is being entered. With a Note it hangs over the place it will
 * drop to, a plumb line showing the way down; without one it is held where
 * pending discs wait.
 */
export const HeldDiscLayer = ({
  candidate,
  geometry,
  held,
}: {
  readonly candidate: RulerCandidate;
  readonly geometry: Geometry;
  readonly held: HeldDisc;
}) => {
  const beside = held.parked && geometry.gutter === 0;
  const half =
    candidate.text.length * heldText.halfCharacter + heldText.padding;
  const from = held.y + held.r + plumb.fromGap;
  const to = held.restY + held.r - plumb.toGap;
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: An SVG group cannot take focus; the rule mistakes it for an element that can. The Note being entered is said by the form.
    <g aria-hidden="true">
      {held.parked || to - from < plumb.minLength ? null : (
        <path
          data-part="plumb"
          d={`M${tenths(held.x)} ${tenths(from)}V${tenths(to)}`}
        />
      )}
      <g
        data-part="disc"
        data-held=""
        data-look={held.parked ? 'pending' : discLook(candidate.kind, 'graded')}
        transform={`translate(${tenths(held.x)} ${tenths(held.y)})`}
      >
        <circle data-part="disc-body" r={tenths(held.r)} />
      </g>
      <text
        data-part="held-text"
        textAnchor={beside ? 'end' : 'middle'}
        x={tenths(
          beside
            ? held.x - held.r - heldText.besideGap
            : Math.max(half, Math.min(geometry.width - half, held.x)),
        )}
        y={tenths(
          beside
            ? held.y + heldText.baselineShift
            : held.y - held.r - heldText.aboveGap,
        )}
      >
        {candidate.text}
      </text>
    </g>
  );
};

/** The open wedge that shows where the Fach would balance with the Note being entered. */
export const PreviewWedge = ({
  beam,
  x,
}: {
  readonly beam: number;
  readonly x: number;
}) => (
  <g data-part="ruler-preview" transform={`translate(${tenths(x)} ${beam})`}>
    <path data-part="ruler-preview-body" d="M0 0l11 18h-22z" />
  </g>
);
