import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../motion.ts';
import type { Balance } from './balance.ts';
import type { Geometry, PlacedPoint } from './geometry.ts';
import type { RulerScale } from './scale.ts';

/**
 * What is seen to happen when a figure changes: a disc that was there moves,
 * a new one lands, one that is gone lifts off, and only when the falling disc
 * has touched down does the bar lean.
 *
 * A disc's place is an attribute that eases by a CSS transition. Landing and
 * lifting off are animations of the group inside it, so the two never fight.
 */

const timing = {
  slide: 240,
  minFall: 240,
  maxFall: 460,
  fallPerRootPixel: 34,
  /** A disc that comes from nowhere starts this far above its place. */
  minDrop: 70,
  dropShare: 0.7,
  minHover: 40,
  fadeIn: 240,
  labelsFade: 300,
  settle: 940,
  settleStagger: 80,
  settleShown: 0.2,
  settleSlid: 0.62,
  settleHover: 2.2,
} as const;

const easing = {
  standard: 'cubic-bezier(0.3, 0, 0.2, 1)',
  gravity: 'cubic-bezier(0.55, 0, 1, 0.45)',
} as const;

type Spot = { readonly x: number; readonly y: number };

const home = 'translate(0px, 0px)';
const away = (point: PlacedPoint, spot: Spot): string =>
  `translate(${spot.x - point.x}px, ${spot.y - point.y}px)`;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** A disc falls onto the bar: gravity, no bounce. Returns the time of touchdown. */
const drop = (
  node: SVGGElement,
  point: PlacedPoint,
  from: Spot | null,
  geometry: Geometry,
): number => {
  const start = from ?? {
    x: point.x,
    y: point.y - Math.max(timing.minDrop, geometry.beamY * timing.dropShare),
  };
  const slide = Math.abs(start.x - point.x) > 1 ? timing.slide : 0;
  const fall = clamp(
    Math.sqrt(Math.abs(point.y - start.y)) * timing.fallPerRootPixel,
    timing.minFall,
    timing.maxFall,
  );
  const total = slide + fall;
  const hover = { x: point.x, y: Math.min(start.y, point.y - timing.minHover) };
  const falling: Array<Keyframe> = [
    {
      transform: away(point, hover),
      offset: slide / total,
      easing: easing.gravity,
    },
    { transform: home, offset: 1 },
  ];
  node.animate(
    slide === 0
      ? falling
      : [
          { transform: away(point, start), offset: 0, easing: easing.standard },
          ...falling,
        ],
    { duration: total, fill: 'backwards' },
  );
  return total;
};

/**
 * A disc that comes from an exact value, such as an unrounded Schnitt, first
 * hovers over that value, moves to its own and lands there.
 */
const settleIn = (
  node: SVGGElement,
  point: PlacedPoint,
  originX: number,
  index: number,
): void => {
  const lift = -Math.max(timing.minHover, point.r * timing.settleHover);
  const over = `translate(${originX - point.x}px, ${lift}px)`;
  node.animate(
    [
      { transform: over, opacity: 0, offset: 0 },
      {
        transform: over,
        opacity: 1,
        offset: timing.settleShown,
        easing: easing.standard,
      },
      {
        transform: `translate(0px, ${lift}px)`,
        offset: timing.settleSlid,
        easing: easing.gravity,
      },
      { transform: home, offset: 1 },
    ],
    {
      duration: timing.settle,
      delay: index * timing.settleStagger,
      fill: 'backwards',
    },
  );
};

/** For one commit nothing eases, so bar and discs take their new size as one. */
const holdStill = (figure: SVGSVGElement | null): void => {
  if (figure === null) {
    return;
  }
  figure.setAttribute('data-still', '');
  // Reading the box makes the browser take the new places in now, while easing is off.
  figure.getBoundingClientRect();
  figure.removeAttribute('data-still');
};

type Snapshot = {
  readonly placed: ReadonlyMap<string, PlacedPoint>;
  readonly held: Spot | null;
  readonly fulcrum: number | null;
  readonly width: number;
};

export type MotionRefs = {
  readonly figure: RefObject<SVGSVGElement | null>;
  readonly labels: RefObject<SVGGElement | null>;
  /** The motion group of every disc that is drawn, by the disc's id. */
  readonly discs: RefObject<Map<string, SVGGElement>>;
};

type Change = {
  readonly before: Snapshot;
  readonly geometry: Geometry;
  readonly landingId: string | null;
  readonly placed: ReadonlyArray<PlacedPoint>;
  readonly refs: MotionRefs;
};

/** Whether a disc that was there before comes down onto the bar now. */
const landsNow = (
  point: PlacedPoint,
  old: PlacedPoint | undefined,
  landingId: string | null,
): boolean => {
  if (point.waiting) {
    return false;
  }
  if (old === undefined) {
    return point.id === landingId;
  }
  return old.waiting || (point.id === landingId && old.x !== point.x);
};

/** Plays what changed. Returns when the falling disc touches down, and whether anything changed. */
const playChange = ({
  before,
  geometry,
  landingId,
  placed,
  refs,
}: Change): { readonly touchdown: number; readonly changed: boolean } => {
  let touchdown = 0;
  let changed = placed.length !== before.placed.size;
  for (const point of placed) {
    const old = before.placed.get(point.id);
    const node = refs.discs.current.get(point.id);
    changed ||= old === undefined || old.x !== point.x || old.y !== point.y;
    if (node !== undefined && landsNow(point, old, landingId)) {
      touchdown = drop(node, point, before.held ?? old ?? null, geometry);
    } else if (node !== undefined && old === undefined) {
      node.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: timing.fadeIn,
      });
    }
  }
  return { touchdown, changed };
};

const playEntrance = (
  placed: ReadonlyArray<PlacedPoint>,
  refs: MotionRefs,
  xOf: (value: number) => number,
): void => {
  const arriving = placed
    .filter((point) => point.origin !== undefined && !point.waiting)
    .sort((a, b) => a.x - b.x);
  for (const [index, point] of arriving.entries()) {
    const node = refs.discs.current.get(point.id);
    if (node !== undefined) {
      settleIn(node, point, xOf(point.origin ?? 0), index);
    }
  }
};

export const useDiscMotion = ({
  balance,
  fulcrum,
  geometry,
  held,
  landingId,
  placed,
  refs,
  scale,
}: {
  readonly balance: Balance;
  /** Where the discs balance, in units of the bar. */
  readonly fulcrum: number | null;
  readonly geometry: Geometry;
  /** Where the disc being entered is held; a landing disc falls from there. */
  readonly held: Spot | null;
  readonly landingId: string | null;
  readonly placed: ReadonlyArray<PlacedPoint>;
  readonly refs: MotionRefs;
  readonly scale: RulerScale;
}): {
  readonly leaving: ReadonlyArray<PlacedPoint>;
  readonly onLeft: (id: string) => void;
} => {
  const previousRef = useRef<Snapshot | null>(null);
  const [leaving, setLeaving] = useState<ReadonlyArray<PlacedPoint>>([]);

  useLayoutEffect(() => {
    const before = previousRef.current;
    const now = new Map(placed.map((point) => [point.id, point]));
    previousRef.current = {
      placed: now,
      held,
      fulcrum,
      width: geometry.width,
    };
    const calm = prefersReducedMotion();
    if (before === null) {
      if (!calm) {
        playEntrance(
          placed,
          refs,
          (value) => geometry.x0 + scale.unitOf(value) * geometry.pitch,
        );
      }
      balance.set(fulcrum, { immediate: true });
      return;
    }
    if (before.width !== geometry.width || calm) {
      holdStill(refs.figure.current);
      balance.set(fulcrum, { immediate: true });
      return;
    }
    const gone = [...before.placed.values()].filter(
      (point) => !now.has(point.id),
    );
    if (gone.length > 0) {
      setLeaving((list) => [
        ...list.filter((point) => !gone.some((left) => left.id === point.id)),
        ...gone,
      ]);
    }
    const { touchdown, changed } = playChange({
      before,
      geometry,
      landingId,
      placed,
      refs,
    });
    if (changed || gone.length > 0) {
      refs.labels.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: timing.labelsFade,
        delay: touchdown,
        fill: 'backwards',
      });
    }
    balance.set(fulcrum, {
      immediate: before.fulcrum === null,
      delay: touchdown,
    });
  }, [balance, fulcrum, geometry, held, landingId, placed, refs, scale]);

  return {
    leaving,
    onLeft: (id) =>
      setLeaving((list) => list.filter((point) => point.id !== id)),
  };
};
