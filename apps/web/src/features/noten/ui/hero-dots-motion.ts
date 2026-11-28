import { tenths } from '#/shared/ui/ruler/geometry.ts';
import type { HeroDot, HeroLayout } from './hero-layout.ts';

/**
 * Where the dots of the hero are drawn, and how they move. React draws the
 * dots without a place; their centre and radius are written here, like the
 * fulcrum's place, because they change on every frame while the Verlauf is
 * scrubbed or played. A Note that arrives drops onto the bar, and when the
 * day the Verlauf shows changes, every dot grows, shrinks and moves from
 * where it is seen to its place in the new layout, as its share of the
 * Schnitt changes.
 *
 * A dot whose centre or radius changes makes the browser work out its style
 * again, which takes about 30 µs on a slow phone. On most days nearly every
 * dot changes a little, so drawing all of them would take more than a frame
 * for a long Verlauf. A frame therefore draws at most `perFrame` dots, those
 * farthest from where they should be first, and the rest follow in the next
 * frames.
 */

/** A ring is drawn with a thick line; its radius is drawn in, so it takes the room of its dot. */
const ringInset = 0.75;

const landing = {
  /** A dot the Verlauf brings back only drops the last bit. */
  drop: 44,
  dropDuration: 260,
  fallDuration: 300,
  /** A longer fall takes longer, by the root of its height. */
  perRoot: 14,
  /** A dot fades in during the first quarter of its way. */
  fadeUntil: 0.25,
  easing: 'cubic-bezier(.5,0,1,.55)',
} as const;

const moving = {
  duration: 260,
  /** How fast a dot lets go of where it was seen: it halves the way left this many times. */
  halvings: 10,
  /** Closer than this to where it should be, in pixels, a dot that moves is not drawn again. */
  near: 0.05,
  perFrame: 120,
  /** How long a dot that leaves while it lands takes to fade out. */
  fadeDuration: 120,
} as const;

/** How a Note that appears arrives: `fall` from the figure's top, `drop` the last bit only. */
export type Arrival = 'fall' | 'drop';

/** How far a dot is drawn away from its place, and how much larger. */
type Hold = {
  readonly dx: number;
  readonly dy: number;
  readonly scale: number;
};

const none: Hold = { dx: 0, dy: 0, scale: 1 };

/** What is left of `hold` after `elapsed` milliseconds: it eases out to nothing. */
const holdAfter = (hold: Hold, elapsed: number): Hold => {
  if (hold === none || elapsed >= moving.duration) {
    return none;
  }
  // A frame's time can lie before the change that started the way; the dot is then still where it was seen.
  const left =
    2 ** ((-moving.halvings * Math.max(0, elapsed)) / moving.duration);
  return {
    dx: hold.dx * left,
    dy: hold.dy * left,
    scale: 1 + (hold.scale - 1) * left,
  };
};

/** The hold that draws a dot whose place is `to` at `seen`. */
const holdAt = (seen: HeroDot, to: HeroDot): Hold => ({
  dx: seen.x - to.x,
  dy: seen.y - to.y,
  scale: to.r > 0 ? seen.r / to.r : 1,
});

/** Where a dot is drawn with that hold. */
const heldAt = (place: HeroDot, hold: Hold): HeroDot =>
  hold === none
    ? place
    : {
        x: tenths(place.x + hold.dx),
        y: tenths(place.y + hold.dy),
        r: tenths(place.r * hold.scale),
      };

const distance = (drawn: HeroDot | undefined, dot: HeroDot): number =>
  drawn === undefined
    ? Number.POSITIVE_INFINITY
    : Math.max(
        Math.abs(drawn.x - dot.x),
        Math.abs(drawn.y - dot.y),
        Math.abs(drawn.r - dot.r),
      );

/** A dot that leaves while it still lands, so it fades out from how it is seen. */
type Leaving = {
  readonly index: number;
  readonly landing: Animation;
  readonly seen: HeroDot;
  readonly opacity: number;
};

type Due = {
  readonly index: number;
  readonly dot: HeroDot;
  readonly by: number;
};

export type DotsMotion = {
  /**
   * Draws the dots at their places in `layout`. With `animate`, each goes
   * there from where it is seen and the dots from `was` to `count` land;
   * otherwise all are put there at once.
   */
  readonly show: (
    dots: SVGGElement | null,
    layout: HeroLayout,
    change: {
      /** What React draws the dots from: when it changes, they are put at their places at once. */
      readonly drawing: unknown;
      readonly was: number;
      readonly count: number;
      readonly arrival: Arrival;
      readonly animate: boolean;
    },
  ) => void;
  /** Stops drawing; what is drawn stays. */
  readonly stop: () => void;
};

/** Puts one dot where it is drawn. */
const drawAt = (node: Element, dot: HeroDot): void => {
  const r = node.hasAttribute('data-ring')
    ? Math.max(1, dot.r - ringInset)
    : dot.r;
  node.setAttribute('cx', `${dot.x}`);
  node.setAttribute('cy', `${dot.y}`);
  node.setAttribute('r', `${r}`);
};

/** Lets a dot drawn at its place drop onto it. */
const landAt = (node: Element, dot: HeroDot, arrival: Arrival): Animation => {
  const fall = arrival === 'fall';
  // A falling dot starts at the figure's top edge, so it never crosses the head of the page.
  const height = fall ? dot.y + dot.r : landing.drop;
  return node.animate(
    [
      { transform: `translateY(${tenths(-height)}px)`, opacity: 0 },
      { opacity: 1, offset: landing.fadeUntil },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    {
      duration: fall
        ? landing.fallDuration + Math.sqrt(height) * landing.perRoot
        : landing.dropDuration,
      easing: landing.easing,
    },
  );
};

/**
 * Reads, before anything is written, every dot from `from` to `to` that
 * leaves while it still lands. Reading one after another was changed would
 * make the browser work out the style of the whole figure again for each.
 */
const leavingWhileLanding = (
  dots: SVGGElement,
  { from, to }: { readonly from: number; readonly to: number },
  landings: ReadonlyMap<number, Animation>,
  drawn: ReadonlyArray<HeroDot | undefined>,
): ReadonlyArray<Leaving> => {
  const leaving: Array<Leaving> = [];
  for (let index = from; index < to; index += 1) {
    const node = dots.children[index];
    const running = landings.get(index);
    const seen = drawn[index];
    if (
      node !== undefined &&
      seen !== undefined &&
      running !== undefined &&
      running.playState !== 'finished'
    ) {
      const style = getComputedStyle(node);
      // A landing only shifts a dot up, so the matrix holds just that shift.
      const { f } = new DOMMatrixReadOnly(style.transform);
      leaving.push({
        index,
        landing: running,
        seen: { ...seen, y: seen.y + f },
        opacity: Number(style.opacity),
      });
    }
  }
  return leaving;
};

/** Lets a dot that leaves while it lands fade out from how it is seen, not from fully shown. */
const fadeOut = (
  dots: SVGGElement,
  leaving: ReadonlyArray<Leaving>,
  landings: Map<number, Animation>,
): void => {
  for (const dot of leaving) {
    dot.landing.cancel();
    landings.delete(dot.index);
    // Without an end, the fade ends at the opacity the stylesheet gives the dot now: away.
    dots.children[dot.index]?.animate([{ opacity: dot.opacity, offset: 0 }], {
      duration: moving.fadeDuration,
      easing: 'linear',
    });
  }
};

/** Ends every landing, so a dot put at its place, or hidden, is not held where it was. */
const endLandings = (landings: Map<number, Animation>): void => {
  for (const running of landings.values()) {
    running.cancel();
  }
  landings.clear();
};

const sameDot = (left: HeroDot | undefined, right: HeroDot): boolean =>
  left !== undefined &&
  left.x === right.x &&
  left.y === right.y &&
  left.r === right.r;

export const createDotsMotion = (): DotsMotion => {
  let group: SVGGElement | null = null;
  let drawing: unknown = null;
  let places: ReadonlyArray<HeroDot> = [];
  let holds: ReadonlyArray<Hold> = [];
  /** Where each dot is drawn now. */
  let drawn: Array<HeroDot | undefined> = [];
  let since = 0;
  let frame = 0;
  const landings = new Map<number, Animation>();

  const draw = (index: number, dot: HeroDot): void => {
    const node = group?.children[index];
    // Writing a dot's place again, even unchanged, makes the browser work out its style again.
    if (node !== undefined && !sameDot(drawn[index], dot)) {
      drawAt(node, dot);
      drawn[index] = dot;
    }
  };

  /** Draws up to `limit` dots, those farthest from where they should be first; tells whether any is still on its way. */
  const paint = (now: number, limit: number): boolean => {
    const due: Array<Due> = [];
    let holding = false;
    places.forEach((place, index) => {
      const hold = holdAfter(holds[index] ?? none, now - since);
      const dot = heldAt(place, hold);
      const by = distance(drawn[index], dot);
      holding ||= hold !== none;
      // A dot at rest is drawn exactly at its place; one on its way only when it has gone far enough to show.
      if (hold === none ? by > 0 : by >= moving.near) {
        due.push({ index, dot, by });
      }
    });
    if (due.length > limit) {
      due.sort((left, right) => right.by - left.by);
    }
    for (const { index, dot } of due.slice(0, limit)) {
      draw(index, dot);
    }
    return holding || due.length > limit;
  };

  const tick = (now: number): void => {
    frame = paint(now, moving.perFrame) ? requestAnimationFrame(tick) : 0;
  };

  const stop = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  /** Lets the dots `from` to `to` drop onto the bar. */
  const land = (from: number, to: number, arrival: Arrival): void => {
    for (let index = from; index < to; index += 1) {
      const node = group?.children[index];
      const dot = places[index];
      if (node !== undefined && dot !== undefined) {
        draw(index, dot);
        landings.set(index, landAt(node, dot, arrival));
      }
    }
  };

  const show: DotsMotion['show'] = (dots, layout, change) => {
    stop();
    const now = performance.now();
    // Dots that were drawn anew, or added and removed, are put at their places.
    const fresh =
      dots !== group ||
      change.drawing !== drawing ||
      dots?.children.length !== drawn.length;
    ({ drawing } = change);
    if (fresh) {
      drawn = Array.from(
        { length: dots?.children.length ?? 0 },
        () => undefined,
      );
    }
    group = dots;
    if (dots === null || fresh || !change.animate) {
      endLandings(landings);
      places = layout.dots;
      holds = [];
      paint(now, Number.POSITIVE_INFINITY);
      return;
    }
    const leaving = leavingWhileLanding(
      dots,
      { from: change.count, to: change.was },
      landings,
      drawn,
    );
    const seen = new Map(leaving.map((dot) => [dot.index, dot.seen]));
    holds = layout.dots.map((place, index) => {
      const at = seen.get(index) ?? drawn[index];
      return at === undefined || (index >= change.was && index < change.count)
        ? none
        : holdAt(at, place);
    });
    places = layout.dots;
    since = now;
    fadeOut(dots, leaving, landings);
    land(change.was, change.count, change.arrival);
    // The first frame is drawn now, before the browser shows the change.
    frame = paint(now, moving.perFrame) ? requestAnimationFrame(tick) : 0;
  };

  return { show, stop };
};
