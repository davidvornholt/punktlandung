import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { magnifier } from './rounding-magnifier-model.ts';

type Rounding = {
  /** The mark the Fachschnitt is rounded to. */
  readonly halbjahresnote: number;
  /** The unrounded Fachschnitt. */
  readonly schnitt: number;
  readonly system: Notensystem;
};

const Glass = ({
  narrow,
  ...rounding
}: Rounding & { readonly narrow: boolean }) => {
  const glass = magnifier({ ...rounding, narrow });
  return (
    <svg
      aria-hidden="true"
      className={`mx-auto overflow-visible ${narrow ? 'desk:hidden' : 'desk:block hidden'}`}
      height={glass.height}
      viewBox={`0 0 ${glass.width} ${glass.height}`}
      width={glass.width}
    >
      <rect className="fill-ruler" {...glass.bar} />
      <path className="fill-none stroke-1 stroke-ruler-ink" d={glass.ticks} />
      <rect className="fill-none stroke-1 stroke-edge" {...glass.bar} />
      <path
        className="fill-none stroke-1 stroke-ink opacity-60 [stroke-dasharray:2_2.5]"
        d={glass.bounds}
      />
      {glass.arrow === null ? null : (
        <>
          <path
            className="fill-none stroke-[1.25] stroke-ink"
            d={glass.arrow.line}
          />
          <path className="fill-ink" d={glass.arrow.head} />
        </>
      )}
      <circle
        className="fill-note stroke-1 stroke-edge"
        cx={glass.dot.x}
        cy={glass.dot.y}
        r={glass.dot.r}
      />
    </svg>
  );
};

/**
 * Rounding shown as what it is: a small move along the bar to the nearest
 * mark. A picture beside the two numbers it connects, so it says nothing to
 * a screen reader. It is drawn in two sizes, and the window's width shows one.
 */
export const RoundingMagnifier = (rounding: Rounding) => (
  <>
    <Glass {...rounding} narrow={true} />
    <Glass {...rounding} narrow={false} />
  </>
);
