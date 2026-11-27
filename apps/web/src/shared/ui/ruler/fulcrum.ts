import { type RefObject, useRef } from 'react';
import {
  type Balance,
  type BalancePaint,
  balanceConfigs,
  useBalance,
} from './balance.ts';
import { type Geometry, tenths } from './geometry.ts';
import { formatFulcrum, type RulerScale } from './scale.ts';

type FulcrumRefs = {
  readonly fulcrum: RefObject<SVGGElement | null>;
  readonly tilt: RefObject<SVGGElement | null>;
  readonly value: RefObject<SVGTextElement | null>;
  readonly caption: RefObject<SVGTextElement | null>;
};

/** What stands under the fulcrum. */
type FulcrumWords = {
  readonly caption: string;
  /** The Schnitt the fulcrum is sent to; the figure at rest prints exactly this. */
  readonly value: number | null;
};

const tiltDigits = 3;
const textPadding = 2;

/** Keeps the Schnitt and its caption on the sheet when the fulcrum stands near an end. */
const placeFulcrumText = (
  refs: FulcrumRefs,
  x: number,
  width: number,
): void => {
  const value = refs.value.current;
  const caption = refs.caption.current;
  if (value === null || caption === null) {
    return;
  }
  const half =
    Math.max(value.getComputedTextLength(), caption.getComputedTextLength()) /
      2 +
    textPadding;
  const shift = tenths(Math.max(half - x, Math.min(0, width - half - x)));
  value.setAttribute('x', `${shift}`);
  caption.setAttribute('x', `${shift}`);
};

/**
 * Draws a frame of the balance straight into the figure. React draws the
 * figure; where the fulcrum stands and how far the bar leans changes sixty
 * times a second and is written past it.
 */
const fulcrumPaint =
  (
    refs: FulcrumRefs,
    geometry: Geometry,
    scale: RulerScale,
    words: FulcrumWords,
  ): BalancePaint =>
  (pos, tilt, resting) => {
    const fulcrum = refs.fulcrum.current;
    const tiltLayer = refs.tilt.current;
    if (fulcrum === null || tiltLayer === null) {
      return;
    }
    if (pos === null) {
      fulcrum.setAttribute('display', 'none');
      tiltLayer.removeAttribute('transform');
      return;
    }
    const x = tenths(geometry.x0 + pos * geometry.pitch);
    fulcrum.removeAttribute('display');
    fulcrum.setAttribute('transform', `translate(${x} ${geometry.beam})`);
    if (tilt === 0) {
      tiltLayer.removeAttribute('transform');
    } else {
      tiltLayer.setAttribute(
        'transform',
        `rotate(${tilt.toFixed(tiltDigits)} ${x} ${geometry.beam})`,
      );
    }
    if (refs.value.current !== null && refs.caption.current !== null) {
      refs.value.current.textContent = formatFulcrum(
        scale,
        pos,
        resting,
        words.value,
      );
      refs.caption.current.textContent = words.caption;
      placeFulcrumText(refs, x, geometry.width);
    }
  };

/** The balance of one figure and the parts of the figure it moves. */
export const useFulcrum = ({
  caption,
  geometry,
  scale,
  value,
}: FulcrumWords & {
  readonly geometry: Geometry;
  readonly scale: RulerScale;
}): {
  readonly balance: Balance;
  readonly fulcrumRef: RefObject<SVGGElement | null>;
  /** The bar and what rests on it: the group that leans. */
  readonly tiltRef: RefObject<SVGGElement | null>;
  readonly valueRef: RefObject<SVGTextElement | null>;
  readonly captionRef: RefObject<SVGTextElement | null>;
} => {
  const fulcrumRef = useRef<SVGGElement>(null);
  const tiltRef = useRef<SVGGElement>(null);
  const valueRef = useRef<SVGTextElement>(null);
  const captionRef = useRef<SVGTextElement>(null);
  const balance = useBalance(
    balanceConfigs[geometry.variant === 'row' ? 'row' : 'bench'],
    fulcrumPaint(
      {
        fulcrum: fulcrumRef,
        tilt: tiltRef,
        value: valueRef,
        caption: captionRef,
      },
      geometry,
      scale,
      { caption, value },
    ),
  );
  return { balance, fulcrumRef, tiltRef, valueRef, captionRef };
};
