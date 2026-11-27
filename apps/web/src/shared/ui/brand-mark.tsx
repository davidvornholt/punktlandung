/** The size the mark is drawn at; every other size is scaled from its height. */
const drawn = { width: 30, height: 26 } as const;

/**
 * The outer edges of the two shapes that carry a rim, in the mark's own
 * units, and the width of that rim in CSS pixels. The rim is the line that
 * sets a filled shape off from pale paper, as on every ruler of the app, so
 * it keeps its width however large the mark is drawn.
 */
const disc = { x: 18.5, y: 6.5, radius: 5.5 } as const;
const bar = { left: 0.4, top: 12, width: 29.2, height: 6.2 } as const;
const rimWidth = 1.25;

/**
 * The mark of the app: a Note as a red disc that has landed on the yellow
 * ruler, exactly over the wedge the ruler balances on. It stands beside the
 * name, so it is hidden from screen readers.
 */
export const BrandMark = ({
  className,
  height = drawn.height,
  motion,
}: {
  readonly className?: string;
  /** In CSS pixels. */
  readonly height?: number;
  /**
   * `lands` plays the landing once: the disc drops onto the ruler, which
   * settles level. `hops` is the answer to a press: the disc jumps and lands
   * again. `sways` keeps the ruler rocking while something loads.
   */
  readonly motion?: 'lands' | 'hops' | 'sways';
}) => {
  const rim = (rimWidth * drawn.height) / height;
  const inset = rim / 2;
  return (
    <svg
      aria-hidden={true}
      className={`shrink-0 overflow-visible ${className ?? ''}`}
      data-motion={motion}
      data-part="brand-mark"
      height={height}
      viewBox={`0 0 ${drawn.width} ${drawn.height}`}
      width={(height * drawn.width) / drawn.height}
    >
      <g data-part="brand-beam">
        {/* Slate needs no rim, so there each rim takes the colour of its shape, and the disc still touches the ruler. */}
        <circle
          className="fill-note stroke-edge dark:stroke-note"
          cx={disc.x}
          cy={disc.y}
          data-part="brand-disc"
          r={disc.radius - inset}
          strokeWidth={rim}
        />
        <rect
          className="fill-ruler stroke-edge dark:stroke-ruler"
          height={bar.height - rim}
          strokeWidth={rim}
          width={bar.width - rim}
          x={bar.left + inset}
          y={bar.top + inset}
        />
      </g>
      <path className="fill-ink" d="M18.5 18l4.2 7h-8.4z" />
    </svg>
  );
};
