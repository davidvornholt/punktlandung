import { tenths } from '#/shared/ui/ruler/geometry.ts';
import type { HeroDot, HeroLayout } from './hero-layout.ts';

/**
 * How the dots of the hero follow the day the Verlauf shows: a dot that lay
 * on the bar before grows, shrinks and moves to its place in the new layout,
 * as its share of the Schnitt changes. A dot that is still fading in as it
 * lands goes on from the opacity it is seen with.
 */

const resizing = {
  duration: 260,
  easing: 'cubic-bezier(.2,0,0,1)',
  scaleDigits: 3,
  /** How long a dot that was fading in takes for the rest of its fade. */
  fadeDuration: 120,
} as const;

/** Where a dot is seen now, while it may still be on its way from somewhere else. */
const seenAt = (node: Element, dot: HeroDot): HeroDot => {
  // A dot is only ever moved and scaled about its centre, so the matrix holds just a scale and a shift.
  const { a, e, f } = new DOMMatrixReadOnly(getComputedStyle(node).transform);
  return { x: dot.x + e, y: dot.y + f, r: dot.r * a };
};

const animatesOpacity = (animation: Animation): boolean =>
  animation.effect instanceof KeyframeEffect &&
  animation.effect.getKeyframes().some((frame) => 'opacity' in frame);

/** Lets one dot go from where it is seen to its new place. One that is still on its way goes on from where it is. */
const resizeDot = (node: Element, from: HeroDot, to: HeroDot): void => {
  // A dot fades in and out by a CSS transition of its opacity, which goes on undisturbed.
  const running = node
    .getAnimations()
    .filter((animation) => !(animation instanceof CSSTransition));
  const seen = running.length === 0 ? from : seenAt(node, from);
  const fading = running.some(animatesOpacity)
    ? Number(getComputedStyle(node).opacity)
    : null;
  for (const animation of running) {
    animation.cancel();
  }
  if (fading !== null) {
    // Without an end, the fade ends at the opacity the stylesheet gives the dot now: shown, dimmed or away.
    node.animate([{ opacity: fading, offset: 0 }], {
      duration: resizing.fadeDuration,
      easing: 'linear',
    });
  }
  if (seen.x === to.x && seen.y === to.y && seen.r === to.r) {
    return;
  }
  const scale = to.r > 0 ? seen.r / to.r : 1;
  node.animate(
    [
      {
        transform: `translate(${tenths(seen.x - to.x)}px, ${tenths(seen.y - to.y)}px) scale(${scale.toFixed(resizing.scaleDigits)})`,
      },
      { transform: 'none' },
    ],
    { duration: resizing.duration, easing: resizing.easing },
  );
};

/** Lets the dots that lay on the bar before, `0` to `upTo`, go to their place in the new layout. */
export const resize = (
  dots: SVGGElement | null,
  before: HeroLayout,
  after: HeroLayout,
  upTo: number,
): void => {
  const nodes = dots?.children;
  for (let index = 0; index < upTo; index += 1) {
    const node = nodes?.[index];
    const from = before.dots[index];
    const to = after.dots[index];
    if (node !== undefined && from !== undefined && to !== undefined) {
      resizeDot(node, from, to);
    }
  }
};
