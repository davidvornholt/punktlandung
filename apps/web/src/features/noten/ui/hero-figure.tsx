import { type RefObject, useMemo, useRef, useState } from 'react';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
import { RulerBar } from '#/shared/ui/ruler/ruler-bar.tsx';
import { useHostWidth } from '#/shared/ui/ruler/ruler-hooks.ts';
import { punkteScale } from '#/shared/ui/ruler/scale.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';
import type { Arrival } from './hero-dots-motion.ts';
import { heroDayLayout, heroLayout, heroNotesAfter } from './hero-layout.ts';
import type { HeroDotInfo } from './hero-model.ts';
import { useHeroMotion, useHeroParts } from './hero-motion.ts';

/** Where the Gesamtschnitt and the line under it stand below the fulcrum, and how big they are. */
const figureText = {
  wide: {
    valueSize: 124,
    valueY: 140,
    unitSize: 44,
    unitDx: 10,
    equivSize: 14.5,
    equivY: 172,
  },
  phone: {
    valueSize: 78,
    valueY: 98,
    unitSize: 30,
    unitDx: 6,
    equivSize: 13.5,
    equivY: 122,
  },
} as const;

export type HeroFigureProps = {
  /** How a Note that appears arrives. */
  readonly arrival: Arrival;
  /** The caption that lies over a corner of the figure on a wide screen. */
  readonly captionRef: RefObject<HTMLElement | null>;
  /** How many of the Noten lie on the bar: the first `count`. */
  readonly count: number;
  /** One per entry, in the same order. */
  readonly dots: ReadonlyArray<HeroDotInfo>;
  /** Every Note, in the order they were written. */
  readonly entries: ReadonlyArray<TrendEntry>;
  /** Names the figure for screen readers. */
  readonly label: string;
};

/**
 * The dots on the bar. Pointing at one picks out every Note of its Fach; the
 * tooltip layer names the one pointed at.
 */
const HeroDots = ({
  count,
  dots,
  groupRef,
}: Pick<HeroFigureProps, 'count' | 'dots'> & {
  readonly groupRef: RefObject<SVGGElement | null>;
}) => {
  const [pick, setPick] = useState<string | null>(null);
  return (
    <g
      data-part="hero-dots"
      data-pick={flag(pick !== null)}
      onPointerLeave={() => setPick(null)}
      onPointerOver={(event) =>
        setPick(
          event.target instanceof Element
            ? event.target.getAttribute('data-fach')
            : null,
        )
      }
      ref={groupRef}
    >
      {/* Where a dot is drawn and how large is written by hero-dots-motion.ts. */}
      {dots.map((dot, index) => (
        <circle
          data-away={flag(index >= count)}
          data-fach={dot.fachId}
          data-part="hero-dot"
          data-picked={flag(dot.fachId === pick)}
          data-ring={flag(dot.ring)}
          data-stratum={dot.stratum}
          data-tip={index < count ? dot.tip : undefined}
          key={dot.id}
        />
      ))}
    </g>
  );
};

const HeroSvg = ({
  arrival,
  captionRef,
  count,
  dots,
  entries,
  label,
  width,
}: HeroFigureProps & { readonly width: number }) => {
  const today = useMemo(
    () => heroLayout(heroNotesAfter(entries, entries.length), width),
    [entries, width],
  );
  const layout = useMemo(
    () => heroDayLayout({ count, entries, today, width }),
    [count, entries, today, width],
  );
  const parts = useHeroParts();
  useHeroMotion({
    arrival,
    captionRef,
    count,
    dots,
    layout,
    parts,
    schnitt: entries[count - 1]?.schnitt ?? null,
  });
  const text = layout.phone ? figureText.phone : figureText.wide;
  // The bar has a tick per tenth; it is not drawn again with every Note that lands.
  const bar = useMemo(
    () => (
      <RulerBar
        height={layout.beam}
        numerals={true}
        pitch={layout.pitch}
        scale={punkteScale}
        x0={0}
        y={layout.beamY}
      />
    ),
    [layout.beam, layout.beamY, layout.pitch],
  );
  return (
    <svg
      aria-label={label}
      className="block overflow-visible"
      height={layout.height}
      role="img"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
    >
      <g ref={parts.tilt}>
        {bar}
        <HeroDots count={count} dots={dots} groupRef={parts.dots} />
      </g>
      <g ref={parts.fulcrum}>
        <path data-part="fulcrum-body" d="M0 0l13 22h-26z" />
        <path data-part="fulcrum-ground" d="M-30 23h60" />
        <path
          data-part="fulcrum-hatch"
          d="M-22 23l-7 7M-13 23l-7 7M-4 23l-7 7M5 23l-7 7M14 23l-7 7M23 23l-7 7"
        />
        <text
          className="font-bold tracking-[-0.035em]"
          fontSize={text.valueSize}
          ref={parts.figure}
          textAnchor="middle"
          y={text.valueY}
        >
          <tspan ref={parts.value} />
          <tspan
            className="tracking-normal"
            dx={text.unitDx}
            fontSize={text.unitSize}
          >
            P.
          </tspan>
        </text>
        <text
          className="fill-ink-soft"
          fontSize={text.equivSize}
          ref={parts.equiv}
          textAnchor="middle"
          y={text.equivY}
        />
      </g>
    </svg>
  );
};

/**
 * The hero of the Übersicht: every Note as a dot on the bar, piled over its
 * Notenpunkt, and the fulcrum under the Gesamtschnitt. A dot's area is the
 * Note's share of the Gesamtschnitt of the day shown, so the fulcrum stands
 * where their shares balance. On a phone the bar runs from edge to edge of the screen.
 */
export const HeroFigure = (props: HeroFigureProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useHostWidth(hostRef);
  return (
    <div className="-mx-4 desk:mx-0 min-w-0" ref={hostRef}>
      {width === null ? null : <HeroSvg {...props} width={width} />}
    </div>
  );
};
