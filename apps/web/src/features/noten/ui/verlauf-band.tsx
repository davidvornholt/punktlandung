import { memo, useId, useMemo, useRef } from 'react';
import { useHostWidth } from '#/shared/ui/ruler/ruler-hooks.ts';
import { useScrubbing } from '#/shared/ui/ruler/scrubbing.ts';
import {
  countAt,
  type VerlaufEntry,
  type VerlaufHalbjahr,
  type VerlaufLayout,
  verlaufLayout,
} from './verlauf-layout.ts';

const sizes = {
  gridOverhang: 6,
  valueLabelX: 11,
  valueLabelDy: 4,
  valueLabel: 11.5,
  markTick: 9,
  markLabelX: 6,
  markLabelY: 20,
  markLabel: 12.5,
  knob: 6,
} as const;

const notIdCharacters = /[^a-z0-9]/giu;

/**
 * What does not move while the hand does: the grid, the axis with its
 * Halbjahre, a tick per Note and the whole line as a pale trace. Kept apart
 * so that a step of the hand does not draw it again.
 */
const VerlaufGround = memo(
  ({
    clipId,
    layout,
  }: {
    readonly clipId: string;
    readonly layout: VerlaufLayout;
  }) => {
    const gridEnd = layout.plot + sizes.gridOverhang;
    return (
      <>
        <defs>
          <clipPath id={`${clipId}-all`}>
            <rect
              height={layout.base - layout.top}
              width={layout.width}
              y={layout.top}
            />
          </clipPath>
        </defs>
        {layout.grid.map((line) => (
          <g key={line.value}>
            <path
              className={line.whole ? 'stroke-line' : 'stroke-line-soft'}
              d={`M0 ${line.y}H${gridEnd}`}
            />
            {line.label === null ? null : (
              <text
                className="fill-ink-soft"
                fontSize={sizes.valueLabel}
                x={layout.plot + sizes.valueLabelX}
                y={line.y + sizes.valueLabelDy}
              >
                {line.label}
              </text>
            )}
          </g>
        ))}
        <path
          className="stroke-[1.5] stroke-ink"
          d={`M0 ${layout.base}H${gridEnd}`}
        />
        {layout.marks.map((mark) => (
          <g key={mark.id}>
            <path
              className="stroke-[1.5] stroke-ink"
              d={`M${mark.x} ${layout.base}v${sizes.markTick}`}
            />
            {mark.label === null ? null : (
              <text
                className="font-bold"
                fontSize={sizes.markLabel}
                x={mark.x + sizes.markLabelX}
                y={layout.base + sizes.markLabelY}
              >
                {mark.label}
              </text>
            )}
          </g>
        ))}
        <path className="stroke-ink opacity-50" d={layout.rug} />
        <path
          className="fill-none stroke-[1.5] stroke-line"
          clipPath={`url(#${clipId}-all)`}
          d={layout.line}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  },
);

const VerlaufSvg = ({
  clipId,
  count,
  layout,
}: {
  readonly clipId: string;
  readonly count: number;
  readonly layout: VerlaufLayout;
}) => {
  const hand = layout.hands[count] ?? { x: 0, y: layout.base };
  return (
    <svg
      aria-hidden="true"
      className="block overflow-visible"
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
    >
      <VerlaufGround clipId={clipId} layout={layout} />
      {/* The part of the line up to the hand is drawn in ink over the pale trace. */}
      <clipPath id={`${clipId}-past`}>
        <rect height={layout.base - layout.top} width={hand.x} y={layout.top} />
      </clipPath>
      <path
        className="fill-none stroke-[2.25] stroke-ink"
        clipPath={`url(#${clipId}-past)`}
        d={layout.line}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform={`translate(${hand.x} 0)`}>
        <path
          className="stroke-ink"
          d={`M0 0V${layout.base}`}
          strokeDasharray="2 3"
        />
        <circle
          className="fill-note stroke-[1.5] stroke-edge"
          cy={hand.y}
          r={sizes.knob}
        />
      </g>
    </svg>
  );
};

/**
 * The Verlauf: where the Gesamtschnitt stood after every Note, as a line over
 * time. The hand marks the day the hero shows. Dragging on the band moves it;
 * the slider under it does the same from the keyboard, one Note per step.
 */
export const VerlaufBand = ({
  count,
  entries,
  halbjahre,
  onScrub,
  today,
  valueText,
}: {
  /** How many Noten lie on the bar: where the hand stands. */
  readonly count: number;
  readonly entries: ReadonlyArray<VerlaufEntry>;
  readonly halbjahre: ReadonlyArray<VerlaufHalbjahr>;
  /** Told how many Noten should lie on the bar. */
  readonly onScrub: (count: number) => void;
  /** ISO date. */
  readonly today: string;
  /** What the slider says for where the hand stands. */
  readonly valueText: string;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useHostWidth(hostRef);
  const clipId = `verlauf-${useId().replaceAll(notIdCharacters, '')}`;
  const layout = useMemo(
    () =>
      width === null
        ? null
        : verlaufLayout({ entries, halbjahre, hostWidth: width, today }),
    [entries, halbjahre, today, width],
  );
  const scrubbing = useScrubbing<HTMLDivElement>((event) => {
    if (layout !== null) {
      const { left } = event.currentTarget.getBoundingClientRect();
      onScrub(countAt(layout, entries, event.clientX - left));
    }
  });
  return (
    <div
      // Dragging must not select the labels of the figure. On a phone the band runs from edge to edge, so the focus ring is drawn inside it.
      className="relative -mx-4 desk:mx-0 cursor-ew-resize touch-pan-y select-none has-focus-visible:outline-[2.5px] has-focus-visible:outline-focus desk:has-focus-visible:outline-offset-[3px] has-focus-visible:outline-offset-[-2.5px]"
      {...scrubbing}
      ref={hostRef}
    >
      {layout === null ? null : (
        <VerlaufSvg clipId={clipId} count={count} layout={layout} />
      )}
      <input
        aria-label="Verlauf: Stand nach einer Anzahl von Noten"
        aria-valuetext={valueText}
        className="pointer-events-none absolute inset-0 m-0 size-full opacity-0"
        max={entries.length}
        min={0}
        onChange={(event) => onScrub(Number(event.target.value))}
        step={1}
        type="range"
        value={count}
      />
    </div>
  );
};
