import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toSechser } from '#/shared/noten/notenwert.ts';
import { prefersReducedMotion } from '#/shared/ui/motion.ts';
import {
  type BalancePaint,
  balanceConfigs,
  useBalance,
} from '#/shared/ui/ruler/balance.ts';
import { tenths } from '#/shared/ui/ruler/geometry.ts';
import { punkteScale } from '#/shared/ui/ruler/scale.ts';
import { type Arrival, createDotsMotion } from './hero-dots-motion.ts';
import type { HeroLayout } from './hero-layout.ts';

/**
 * What moves in the hero. React draws the figure; where the fulcrum stands,
 * how far the bar leans and what the big figure says change sixty times a
 * second and are written past it. A Note that arrives drops onto the bar,
 * and the others grow or shrink to their share of the new Schnitt. Only
 * `transform` and `opacity` are animated.
 */

export type HeroParts = {
  /** The bar and the dots on it: the group that leans. */
  readonly tilt: RefObject<SVGGElement | null>;
  readonly fulcrum: RefObject<SVGGElement | null>;
  /** The big figure with its unit. */
  readonly figure: RefObject<SVGTextElement | null>;
  readonly value: RefObject<SVGTSpanElement | null>;
  readonly equiv: RefObject<SVGTextElement | null>;
  /** The group whose children are the dots, in the order of the Noten. */
  readonly dots: RefObject<SVGGElement | null>;
};

export const useHeroParts = (): HeroParts => {
  const tiltRef = useRef<SVGGElement>(null);
  const fulcrumRef = useRef<SVGGElement>(null);
  const figureRef = useRef<SVGTextElement>(null);
  const valueRef = useRef<SVGTSpanElement>(null);
  const equivRef = useRef<SVGTextElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  return useMemo(
    () => ({
      tilt: tiltRef,
      fulcrum: fulcrumRef,
      figure: figureRef,
      value: valueRef,
      equiv: equivRef,
      dots: dotsRef,
    }),
    [],
  );
};

/** The part of the figure's width the big figure may stand in. */
type Room = { readonly from: number; readonly to: number };

type Frame = {
  readonly layout: HeroLayout;
  readonly room: Room;
  /** The Gesamtschnitt the fulcrum is on its way to, in Notenpunkte. */
  readonly schnitt: number | null;
};

const atRest = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
/** While the fulcrum moves the figure keeps one decimal, so its width does not change on every frame. */
const moving = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const text = {
  /** Air between the big figure and the edge of its room. */
  padding: 4,
  phonePadding: 16,
  /** Air between the caption and the big figure. */
  captionGap: 28,
  tiltDigits: 3,
} as const;

/**
 * Where the big figure may stand. On a wide screen the caption lies over a
 * lower corner of the figure, and the big figure keeps clear of it.
 */
const roomBeside = (
  caption: HTMLElement | null,
  figure: SVGGElement | null,
  width: number,
): Room => {
  const svg = figure?.ownerSVGElement ?? null;
  if (
    caption === null ||
    svg === null ||
    getComputedStyle(caption).position !== 'absolute'
  ) {
    return { from: 0, to: width };
  }
  const box = caption.getBoundingClientRect();
  const left = box.left - svg.getBoundingClientRect().left;
  return left < width / 2
    ? { from: left + box.width + text.captionGap, to: width }
    : { from: 0, to: left - text.captionGap };
};

/**
 * How wide the big figure is, by what it says. Measuring it makes the browser
 * lay out the page first, and while the dots move that is once more per frame.
 */
const textLengths = new WeakMap<SVGTextElement, Map<string, number>>();

const lengthOf = (figure: SVGTextElement, phone: boolean): number => {
  const known = textLengths.get(figure) ?? new Map<string, number>();
  textLengths.set(figure, known);
  const key = `${phone}:${figure.textContent}`;
  const length = known.get(key) ?? figure.getComputedTextLength();
  known.set(key, length);
  return length;
};

/** Shifts the big figure and the line under it, so both stay in their room. */
const placeText = (parts: HeroParts, frame: Frame, x: number): void => {
  const figure = parts.figure.current;
  const equiv = parts.equiv.current;
  if (figure === null || equiv === null) {
    return;
  }
  const half =
    lengthOf(figure, frame.layout.phone) / 2 +
    (frame.layout.phone ? text.phonePadding : text.padding);
  const from = frame.room.from + half;
  const centre = Math.min(
    Math.max(x, from),
    Math.max(from, frame.room.to - half),
  );
  const shift = `${tenths(centre - x)}`;
  figure.setAttribute('x', shift);
  equiv.setAttribute('x', shift);
};

/**
 * The fulcrum creeps the last hundredth of its way for about half a second
 * after it looks still. The figures do not wait for that: once the place it
 * stands on prints the same as where it is going, they print it in full.
 */
const printsAsAtRest = (notenpunkte: number, schnitt: number | null): boolean =>
  schnitt !== null &&
  atRest.format(notenpunkte) === atRest.format(schnitt) &&
  atRest.format(toSechser(notenpunkte)) === atRest.format(toSechser(schnitt));

const paintHero = (
  parts: HeroParts,
  frame: Frame,
  [pos, tilt, resting]: Parameters<BalancePaint>,
): void => {
  const fulcrum = parts.fulcrum.current;
  const tiltLayer = parts.tilt.current;
  if (fulcrum === null || tiltLayer === null) {
    return;
  }
  if (pos === null) {
    fulcrum.setAttribute('visibility', 'hidden');
    tiltLayer.removeAttribute('transform');
    return;
  }
  const { layout } = frame;
  const x = tenths(pos * layout.pitch);
  const pivotY = layout.beamY + layout.beam;
  fulcrum.removeAttribute('visibility');
  fulcrum.setAttribute('transform', `translate(${x} ${pivotY})`);
  if (tilt === 0) {
    tiltLayer.removeAttribute('transform');
  } else {
    tiltLayer.setAttribute(
      'transform',
      `rotate(${tilt.toFixed(text.tiltDigits)} ${x} ${pivotY})`,
    );
  }
  const notenpunkte = punkteScale.valueOf(pos);
  const format =
    resting || printsAsAtRest(notenpunkte, frame.schnitt) ? atRest : moving;
  if (parts.value.current !== null && parts.equiv.current !== null) {
    parts.value.current.textContent = format.format(notenpunkte);
    parts.equiv.current.textContent = `entspricht Note ${format.format(toSechser(notenpunkte))}`;
  }
  placeText(parts, frame, x);
};

/**
 * Keeps the figure in step with what it shows: the fulcrum goes to the
 * Schnitt on its spring, and dots that were added land.
 */
export const useHeroMotion = ({
  arrival,
  captionRef,
  count,
  dots: drawing,
  layout,
  parts,
  schnitt,
}: {
  readonly arrival: Arrival;
  /** The caption that may lie over a corner of the figure. */
  readonly captionRef: RefObject<HTMLElement | null>;
  /** How many Noten lie on the bar. */
  readonly count: number;
  /** What React draws the dots from: when it changes, they are drawn anew. */
  readonly dots: unknown;
  readonly layout: HeroLayout;
  readonly parts: HeroParts;
  /** The Gesamtschnitt of the Noten on the bar, in Notenpunkte. */
  readonly schnitt: number | null;
}): void => {
  const frameRef = useRef<Frame>({
    layout,
    room: { from: 0, to: layout.width },
    schnitt,
  });
  const balance = useBalance(balanceConfigs.hero, (...frame) =>
    paintHero(parts, frameRef.current, frame),
  );
  const seenRef = useRef<{
    readonly count: number;
    readonly width: number;
  } | null>(null);
  const [dots] = useState(createDotsMotion);
  useEffect(() => dots.stop, [dots]);

  useLayoutEffect(() => {
    const before = seenRef.current;
    seenRef.current = { count, width: layout.width };
    // The first drawing and a figure that changed its size are placed, not moved.
    const still = before === null || before.width !== layout.width;
    // The caption only moves with the figure's size, so the room is not measured with every Note.
    frameRef.current = {
      layout,
      schnitt,
      room: still
        ? roomBeside(captionRef.current, parts.tilt.current, layout.width)
        : frameRef.current.room,
    };
    dots.show(parts.dots.current, layout, {
      drawing,
      was: before?.count ?? count,
      count,
      arrival,
      animate: !(still || prefersReducedMotion()),
    });
    balance.set(schnitt === null ? null : punkteScale.unitOf(schnitt), {
      immediate: still,
    });
  }, [
    arrival,
    balance,
    captionRef,
    count,
    dots,
    drawing,
    layout,
    parts,
    schnitt,
  ]);

  // The figure is measured to place it; once the font has loaded it is wider.
  useEffect(() => {
    let current = true;
    document.fonts.ready.then(() => {
      if (current) {
        if (parts.figure.current !== null) {
          textLengths.delete(parts.figure.current);
        }
        balance.repaint();
      }
    });
    return () => {
      current = false;
    };
  }, [balance, parts]);
};

const playing = {
  /** A breath before the first Note lands. */
  delay: 250,
  /** The older Halbjahre land within this time, slowly at first. */
  fast: 1900,
  exponent: 0.9,
  /** The Noten of the current Halbjahr land one by one. */
  perNote: 105,
  /** All of them together take no longer than this. */
  slowLimit: 2200,
} as const;

/**
 * How many Noten lie on the bar `elapsed` milliseconds into the sequence.
 * The first `fastUntil` are the older Halbjahre; the rest land one by one.
 */
export const playIndex = (
  elapsed: number,
  fastUntil: number,
  total: number,
): number => {
  if (elapsed < 0) {
    return 0;
  }
  const fast = fastUntil === 0 ? 0 : playing.fast;
  if (elapsed < fast) {
    return Math.floor((elapsed / fast) ** playing.exponent * fastUntil);
  }
  const perNote = Math.min(
    playing.perNote,
    playing.slowLimit / Math.max(1, total - fastUntil),
  );
  return Math.min(
    total,
    fastUntil + Math.floor((elapsed - fast) / perNote) + 1,
  );
};

/**
 * The sequence in which every Note lands again. `onStep` is told how many
 * Noten lie on the bar; `onDone` when all of them do.
 */
export const usePlay = (sequence: {
  readonly fastUntil: number;
  readonly total: number;
  readonly onStep: (count: number) => void;
  readonly onDone: () => void;
}): { readonly start: () => void; readonly stop: () => void } => {
  const sequenceRef = useRef(sequence);
  const frameRef = useRef(0);
  useEffect(() => {
    sequenceRef.current = sequence;
  });
  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  }, []);
  const start = useCallback(() => {
    stop();
    const { total, onStep, onDone } = sequenceRef.current;
    if (total === 0 || prefersReducedMotion()) {
      onDone();
      return;
    }
    onStep(0);
    const begin = performance.now() + playing.delay;
    let shown = 0;
    const tick = (now: number): void => {
      const { current } = sequenceRef;
      const index = playIndex(now - begin, current.fastUntil, current.total);
      if (index > shown) {
        shown = index;
        current.onStep(index);
      }
      if (shown < current.total) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = 0;
        current.onDone();
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { start, stop };
};
