import type { ReactNode, RefObject } from 'react';
import { discLook, flag } from './disc-look.ts';
import {
  type DiscKind,
  type DiscState,
  type PlacedPoint,
  tenths,
} from './geometry.ts';

/** A disc is easy to hit even when it carries little: its target is never smaller than this. */
const minHitRadius = 12;
/** The ring that shows keyboard focus stands this far outside the disc. */
const focusRingGap = 4.5;
const textSize = { large: 14, small: 11.5 } as const;
const largeTextFromRadius = 20;
/** Below this radius the dashes of a waiting disc are drawn finer, so its rim still reads as a circle. */
const smallBelowRadius = 7;

const stripe = { size: 7, half: 3.5 } as const;

/** The black and yellow stripes of a Note that is missing. Each figure brings its own, under its own id. */
export const WarnStripes = ({ id }: { readonly id: string }) => (
  <pattern
    height={stripe.size}
    id={id}
    patternTransform="rotate(-45)"
    patternUnits="userSpaceOnUse"
    width={stripe.size}
  >
    <rect data-part="warn-stripe-a" height={stripe.size} width={stripe.size} />
    <rect data-part="warn-stripe-b" height={stripe.size} width={stripe.half} />
  </pattern>
);

/** Wraps what a disc draws, such as in a link to its Leistung. */
export type DiscWrap = (point: PlacedPoint, body: ReactNode) => ReactNode;

/**
 * One disc. The outer group carries its place, so a change of place is eased;
 * the inner group is free for landing and lifting off.
 */
export const Disc = ({
  highlighted = false,
  leaving = false,
  motionRef,
  onLeft,
  point,
  stripesId,
  wrap,
}: {
  readonly point: PlacedPoint;
  /** The id of the figure's stripe pattern. */
  readonly stripesId: string;
  readonly highlighted?: boolean;
  /** The disc lifts off: it is no longer part of the figure. */
  readonly leaving?: boolean;
  readonly wrap?: DiscWrap | undefined;
  /** Receives the group that motion is applied to, apart from the disc's place. */
  readonly motionRef?: (node: SVGGElement | null) => void;
  readonly onLeft?: () => void;
}) => {
  const look = discLook(
    point.kind,
    point.value === null ? point.state : 'graded',
  );
  const linked = wrap !== undefined && !leaving;
  const body = (
    <>
      <circle
        data-part="disc-hit"
        r={Math.max(tenths(point.r), minHitRadius)}
      />
      <circle
        data-part="disc-body"
        fill={look === 'missing' ? `url(#${stripesId})` : undefined}
        r={tenths(point.r)}
      />
      {linked ? (
        <>
          <circle
            data-part="disc-focus-casing"
            r={tenths(point.r + focusRingGap)}
          />
          <circle data-part="disc-focus" r={tenths(point.r + focusRingGap)} />
        </>
      ) : null}
      {point.text === undefined ? null : (
        <text
          data-part="disc-text"
          dy="0.36em"
          fontSize={
            point.r > largeTextFromRadius ? textSize.large : textSize.small
          }
        >
          {point.text}
        </text>
      )}
    </>
  );
  return (
    <g
      data-part="disc"
      data-dim={flag(point.dim)}
      data-disc={leaving ? undefined : point.id}
      data-focus={flag(point.focus)}
      data-hover={flag(highlighted)}
      data-leaving={flag(leaving)}
      data-link={flag(linked)}
      data-look={look}
      data-small={flag(point.r < smallBelowRadius)}
      data-tip={leaving ? undefined : point.tip}
      onAnimationEnd={leaving ? onLeft : undefined}
      transform={`translate(${tenths(point.x)} ${tenths(point.y)})`}
    >
      <g data-part="disc-motion" ref={motionRef}>
        {wrap === undefined || leaving ? body : wrap(point, body)}
      </g>
    </g>
  );
};

/** The discs of one layer. Each registers the group its motion is applied to under its id. */
export const Discs = ({
  highlightId,
  points,
  registry,
  stripesId,
  wrap,
}: {
  readonly highlightId: string | null;
  readonly points: ReadonlyArray<PlacedPoint>;
  readonly registry: RefObject<Map<string, SVGGElement>>;
  readonly stripesId: string;
  readonly wrap: DiscWrap | undefined;
}) =>
  points.map((point) => (
    <Disc
      highlighted={point.id === highlightId}
      key={point.id}
      motionRef={(node) => {
        if (node === null) {
          registry.current.delete(point.id);
        } else {
          registry.current.set(point.id, node);
        }
      }}
      point={point}
      stripesId={stripesId}
      wrap={wrap}
    />
  ));

const glyph = { size: 28, half: 14, minRadius: 4, shareRadius: 8.5 } as const;

/** The small disc that stands for a Leistung in a list; its area is its share of the Fachschnitt. */
export const DiscGlyph = ({
  kind,
  share,
  state,
}: {
  readonly kind: DiscKind;
  readonly share: number;
  readonly state: DiscState;
}) => {
  const look = discLook(kind, state);
  const stripesId = `stripes-${kind}-${state}`;
  return (
    <svg
      aria-hidden="true"
      data-part="disc-glyph"
      data-look={look}
      height={glyph.size}
      viewBox={`${-glyph.half} ${-glyph.half} ${glyph.size} ${glyph.size}`}
      width={glyph.size}
    >
      {look === 'missing' ? (
        <defs>
          <WarnStripes id={stripesId} />
        </defs>
      ) : null}
      <circle
        data-part="disc-body"
        fill={look === 'missing' ? `url(#${stripesId})` : undefined}
        r={tenths(glyph.minRadius + glyph.shareRadius * Math.sqrt(share))}
      />
    </svg>
  );
};
