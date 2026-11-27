import type {
  Bereichsverhaeltnis,
  Fachgewichtung,
} from '#/shared/noten/notenwert.ts';
import type { ArtDisc, ArtGroup } from './gewichtung-figure-model.ts';
import { gewichtungGroups } from './gewichtung-figure-model.ts';

const glyph = {
  size: 22,
  half: 11,
  maxRadius: 9.5,
  minRadius: 2.5,
  ringStroke: 2.25,
  /** Where the cuts of a shared disc end, as fractions of its radius. */
  cuts: [
    { x: 0, y: -1 },
    { x: 0.866, y: 0.5 },
    { x: -0.866, y: 0.5 },
  ],
  hundredths: 100,
} as const;

const round = (value: number): number =>
  Math.round(value * glyph.hundredths) / glyph.hundredths;

/**
 * What one Note of a Leistungsart weighs, drawn the way its Noten are drawn
 * on the ruler: schriftlich is a filled disc, mündlich a ring, and the area
 * is the weight. It is drawn in ink, not in the red of a Note, because it
 * stands for the rule and not for a Note. A disc that all Noten of the Art
 * share is cut into slices.
 */
export const ArtGlyph = ({
  disc,
}: {
  readonly disc: Pick<ArtDisc, 'area' | 'bereich' | 'shared'>;
}) => {
  const outer = Math.max(
    glyph.minRadius,
    glyph.maxRadius * Math.sqrt(disc.area),
  );
  const ring = disc.bereich === 'muendlich';
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 overflow-visible"
      height={glyph.size}
      viewBox={`${-glyph.half} ${-glyph.half} ${glyph.size} ${glyph.size}`}
      width={glyph.size}
    >
      <circle
        className={`transition-[r] duration-300 ease-standard ${ring ? 'fill-none stroke-ink' : 'fill-ink'}`}
        r={round(ring ? outer - glyph.ringStroke / 2 : outer)}
        strokeWidth={ring ? glyph.ringStroke : undefined}
      />
      {disc.shared ? (
        <path
          className="fill-none stroke-[1.5] stroke-sheet"
          d={glyph.cuts
            .map(
              (cut) => `M0 0L${round(cut.x * outer)} ${round(cut.y * outer)}`,
            )
            .join('')}
        />
      ) : null}
    </svg>
  );
};

/**
 * How the Fachschnitt is split between schriftlich and mündlich: the filled
 * part of the bar is schriftlich. Without a Verhältnis nothing is fixed, so
 * the bar is open, drawn with the dashes of everything that is still open.
 */
export const VerhaeltnisBar = ({
  verhaeltnis,
}: {
  readonly verhaeltnis: Bereichsverhaeltnis | null;
}) => {
  const sum =
    verhaeltnis === null ? 0 : verhaeltnis.schriftlich + verhaeltnis.muendlich;
  if (verhaeltnis === null || sum <= 0) {
    return (
      <div
        aria-hidden="true"
        className="h-2.5 border-[1.5px] border-ink border-dashed"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="h-2.5 overflow-hidden border-[1.5px] border-ink bg-sheet"
    >
      <svg aria-hidden="true" className="block size-full">
        <rect
          className="fill-ink transition-[width] duration-300 ease-standard"
          height="100%"
          width={`${round((verhaeltnis.schriftlich / sum) * glyph.hundredths)}%`}
        />
      </svg>
    </div>
  );
};

const BarLabels = ({
  groups,
}: {
  readonly groups: ReadonlyArray<ArtGroup>;
}) => (
  <p className="mb-1.5 flex justify-between gap-3 whitespace-nowrap text-ink-soft text-xs">
    {groups.map((group) =>
      group.bereich === null ? (
        <span key="liste">Eine gemeinsame Liste</span>
      ) : (
        <span key={group.bereich}>
          {group.bereich === 'schriftlich' ? 'Schriftlich' : 'Mündlich'}{' '}
          <span className="font-bold text-ink">
            {`${group.percent}\u00a0%`}
          </span>
        </span>
      ),
    )}
  </p>
);

const ArtLegend = ({
  groups,
}: {
  readonly groups: ReadonlyArray<ArtGroup>;
}) => (
  // The two Wertungsbereiche stand clearly apart; one common list is one run.
  <div className="flex flex-wrap items-center gap-x-8 gap-y-1.5">
    {groups.map((group) => (
      <ul
        className="flex flex-wrap items-center gap-x-3.5 gap-y-1"
        key={group.bereich ?? 'liste'}
      >
        {group.discs.map((disc) => (
          <li
            className="flex items-center gap-1 whitespace-nowrap text-sm"
            key={disc.kind}
          >
            <ArtGlyph disc={disc} />
            {disc.label}
            {disc.factor === null ? null : (
              <span className="font-bold">{disc.factor}</span>
            )}
          </li>
        ))}
      </ul>
    ))}
  </div>
);

/**
 * The Gewichtung of a Fach at a glance: the split between the two
 * Wertungsbereiche as a bar, and one disc per Leistungsart whose area is what
 * one of its Noten weighs. The sentences beside the figure say the same in
 * words, so the figure is hidden from screen readers.
 */
export const GewichtungFigure = ({
  gewichtung,
}: {
  readonly gewichtung: Fachgewichtung;
}) => {
  const groups = gewichtungGroups(gewichtung);
  return (
    <div
      aria-hidden="true"
      className="grid @min-[36rem]:grid-cols-[14rem_minmax(0,1fr)] items-center gap-x-8 gap-y-3"
    >
      <div>
        <BarLabels groups={groups} />
        <VerhaeltnisBar verhaeltnis={gewichtung.verhaeltnis} />
      </div>
      <ArtLegend groups={groups} />
    </div>
  );
};
