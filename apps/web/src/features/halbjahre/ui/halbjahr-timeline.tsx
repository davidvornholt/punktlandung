import { useRef } from 'react';

import { flag } from '#/shared/ui/ruler/disc-look.ts';
import { useHostWidth } from '#/shared/ui/ruler/ruler-hooks.ts';
import type { Stretch } from './halbjahr-look.ts';
import {
  type Timeline,
  type TimelineBracket,
  type TimelineCandidate,
  type TimelineSegment,
  timeline,
} from './halbjahr-timeline-model.ts';

/** Where the parts of the figure stand, from its top edge down. */
const frame = {
  todayBaseline: 10,
  plumbTop: 14,
  heldTop: 18,
  bandTop: 24,
  bandHeight: 24,
  axis: 48,
  plumbBottom: 58,
  nameBaseline: 73,
  bracket: 89,
  bracketTick: 4,
  captionBaseline: 93,
  height: 98,
  inset: 1,
} as const;

/** How far a tick reaches down from the line: the start of a school year furthest. */
const tickLength = { year: 10, half: 7, month: 4 } as const;

const segmentClass =
  'transition-[stroke-width] duration-150 ease-standard data-hover:stroke-[2.5] data-hover:stroke-ink';

const lookClass = {
  candidate:
    'fill-sheet/80 stroke-2 stroke-ink transition-[x,width] duration-200 ease-standard [stroke-dasharray:5_3.5]',
  current: 'fill-note stroke-[1.25] stroke-edge',
  future: 'fill-paper stroke-[1.5] stroke-ink [stroke-dasharray:4_3.2]',
  stratum0: 'fill-stratum-0 stroke-1 stroke-stratum-edge',
  stratum1: 'fill-stratum-1 stroke-1 stroke-stratum-edge',
  stratum2: 'fill-stratum-2 stroke-1 stroke-stratum-edge',
  stratum3: 'fill-stratum-3 stroke-1 stroke-stratum-edge',
} as const satisfies Record<TimelineSegment['look'], string>;

const Segment = ({
  highlighted,
  onHighlight,
  segment,
}: {
  readonly highlighted: boolean;
  readonly onHighlight: (id: string | null) => void;
  readonly segment: TimelineSegment;
}) => {
  const held = segment.look === 'candidate';
  return (
    <rect
      className={`${segmentClass} ${lookClass[segment.look]}`}
      data-hover={flag(highlighted)}
      data-tip={segment.tip}
      height={frame.bandHeight}
      onPointerEnter={held ? undefined : () => onHighlight(segment.id)}
      onPointerLeave={held ? undefined : () => onHighlight(null)}
      width={segment.width}
      x={segment.x}
      // The Halbjahr in the form is held a little above the line until it is saved.
      y={held ? frame.heldTop : frame.bandTop}
    />
  );
};

/** A dimension line under a run of Halbjahre, broken where its caption stands. */
const Bracket = ({ bracket }: { readonly bracket: TimelineBracket }) => {
  const { caption, from, to } = bracket;
  const middle = (from + to) / 2;
  const ends = `M${from} ${frame.bracket - frame.bracketTick}v${2 * frame.bracketTick}M${to} ${frame.bracket - frame.bracketTick}v${2 * frame.bracketTick}`;
  const line =
    caption === null
      ? `M${from} ${frame.bracket}H${to}`
      : `M${from} ${frame.bracket}H${middle - caption.width / 2}M${middle + caption.width / 2} ${frame.bracket}H${to}`;
  return (
    <g>
      <path
        className="fill-none stroke-[0.9] stroke-ink opacity-75"
        d={`${ends}${line}`}
      />
      {caption === null ? null : (
        <text
          className="fill-ink-soft text-2xs"
          textAnchor="middle"
          x={middle}
          y={frame.captionBaseline}
        >
          {caption.text}
        </text>
      )}
    </g>
  );
};

const Today = ({
  today,
}: {
  readonly today: NonNullable<Timeline['today']>;
}) => (
  <g>
    <text
      className="font-bold text-2xs"
      textAnchor="middle"
      x={today.labelX}
      y={frame.todayBaseline}
    >
      heute
    </text>
    <path
      className="fill-none stroke-ink [stroke-dasharray:2_3]"
      d={`M${today.x} ${frame.plumbTop}V${frame.plumbBottom}`}
    />
  </g>
);

const Figure = ({
  highlightId,
  layout,
  onHighlight,
}: {
  readonly highlightId: string | null;
  readonly layout: Timeline;
  readonly onHighlight: (id: string | null) => void;
}) => (
  <svg
    aria-label={layout.summary}
    className="block overflow-visible"
    height={frame.height}
    role="img"
    viewBox={`0 0 ${layout.width} ${frame.height}`}
    width={layout.width}
  >
    {layout.segments.map((segment) => (
      <Segment
        highlighted={segment.id === highlightId}
        key={segment.id}
        onHighlight={onHighlight}
        segment={segment}
      />
    ))}
    <path
      className="fill-none stroke-[1.5] stroke-ink"
      d={`M${frame.inset} ${frame.axis}H${layout.width - frame.inset}`}
    />
    <path
      className="fill-none stroke-1 stroke-ink"
      d={layout.ticks
        .map((tick) => `M${tick.x} ${frame.axis}v${tickLength[tick.kind]}`)
        .join('')}
    />
    {layout.today === null ? null : <Today today={layout.today} />}
    {layout.names.map((name) => (
      <text
        className="font-bold text-xs"
        key={name.id}
        textAnchor="middle"
        x={name.x}
        y={frame.nameBaseline}
      >
        {name.text}
      </text>
    ))}
    {layout.brackets.map((bracket) => (
      <Bracket bracket={bracket} key={bracket.key} />
    ))}
  </svg>
);

/** What the colours mean, said only for the colours the figure shows. */
const legend = (layout: Timeline): string => {
  const shows = (look: TimelineSegment['look']): boolean =>
    layout.segments.some((segment) => segment.look === look);
  return [
    // "Aktuell", not "laufend": in the holidays it is the Halbjahr that began last.
    shows('current') ? 'Rot: das aktuelle Halbjahr.' : '',
    layout.segments.some((segment) => segment.look.startsWith('stratum'))
      ? 'Blasser: weiter zurück.'
      : '',
    shows('future') ? 'Gestrichelt: noch nicht begonnen.' : '',
    shows('candidate') ? 'Angehoben: das Halbjahr aus dem Formular.' : '',
  ]
    .filter((sentence) => sentence !== '')
    .join(' ');
};

/**
 * The Halbjahre as stretches on one line of time, true to their dates. The
 * line is graduated in months, a bracket under it says which Notensystem a
 * run of Halbjahre counts in, and the Halbjahr being entered in the form is
 * held over the place its dates give it.
 */
export const HalbjahrTimeline = ({
  candidate,
  halbjahre,
  highlightId,
  onHighlight,
  today,
}: {
  readonly candidate: TimelineCandidate | null;
  readonly halbjahre: ReadonlyArray<Stretch>;
  readonly highlightId: string | null;
  readonly onHighlight: (id: string | null) => void;
  /** ISO date. */
  readonly today: string;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useHostWidth(hostRef);
  const layout =
    width === null ? null : timeline({ candidate, halbjahre, today, width });
  return (
    <figure className="mb-5">
      <div className="min-h-[6.125rem] min-w-0" ref={hostRef}>
        {layout === null ? null : (
          <Figure
            highlightId={highlightId}
            layout={layout}
            onHighlight={onHighlight}
          />
        )}
      </div>
      {layout === null ? null : (
        <figcaption className="mt-2 text-ink-soft text-sm">
          {legend(layout)}
        </figcaption>
      )}
    </figure>
  );
};
