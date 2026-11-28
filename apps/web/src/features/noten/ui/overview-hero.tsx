import { ChevronRight, Play, Undo2 } from 'lucide-react';
import { memo, useMemo, useRef, useState } from 'react';
import { buttonClass } from '#/shared/ui/form-classes.ts';
import { buttonIconSize, iconStroke } from '#/shared/ui/icon.ts';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';
import type { Arrival } from './hero-dots-motion.ts';
import { HeroFigure } from './hero-figure.tsx';
import {
  type HeroHalbjahr,
  type HeroLegendItem,
  heroCaption,
  heroDots,
  heroFigureLabel,
  heroLegend,
  heroValueText,
  monthText,
} from './hero-model.ts';
import { usePlay } from './hero-motion.ts';
import { createTrendTextModel } from './trend-text-model.ts';
import { VerlaufBand } from './verlauf-band.tsx';

/** Below this Gesamtschnitt the fulcrum stands in the left half, so the caption moves to the right. */
const middleOfBar = 7.5;

const legendDot = {
  size: 13,
  half: 6.5,
  radius: 5.5,
  ringRadius: 4.25,
} as const;

const Legend = memo(
  ({ items }: { readonly items: ReadonlyArray<HeroLegendItem> }) => (
    <ul
      aria-label="Legende"
      className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-ink-soft text-xs"
    >
      {items.map((item) => (
        <li className="flex items-center gap-1.5" key={item.key}>
          <svg
            aria-hidden="true"
            className="flex-none overflow-visible"
            data-part="hero-legend"
            height={legendDot.size}
            viewBox={`${-legendDot.half} ${-legendDot.half} ${legendDot.size} ${legendDot.size}`}
            width={legendDot.size}
          >
            <circle
              data-part="hero-dot"
              data-ring={flag(item.ring)}
              data-stratum={item.stratum}
              r={item.ring ? legendDot.ringRadius : legendDot.radius}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  ),
);

/**
 * Every Note with the Gesamtschnitt after it: what the figures show, as text.
 * It is long and does not change while the hand of the Verlauf moves, so it
 * is not drawn again with every step.
 */
const VerlaufTable = memo(
  ({ entries }: { readonly entries: ReadonlyArray<TrendEntry> }) => {
    const model = useMemo(() => createTrendTextModel(entries), [entries]);
    return (
      <details className="group mt-1.5">
        <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-ink-soft text-sm hover:text-ink">
          <ChevronRight
            aria-hidden={true}
            className="transition-transform duration-150 ease-standard group-open:rotate-90"
            size={buttonIconSize}
            strokeWidth={iconStroke}
          />
          Verlauf als Tabelle
        </summary>
        <p className="mt-1.5 max-w-[70ch] text-ink-soft text-sm">
          {model.summary}
        </p>
        <div className="mt-3 overflow-x-auto border-[1.5px] border-ink bg-sheet">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <caption className="sr-only">
              Alle Noten mit dem Gesamtschnitt nach jeder Note
            </caption>
            <thead className="text-ink-soft text-xs">
              <tr className="[&_th]:px-3 [&_th]:py-2 [&_th]:font-normal">
                <th scope="col">Datum</th>
                <th scope="col">Halbjahr</th>
                <th scope="col">Fach</th>
                <th scope="col">Leistungsart</th>
                <th scope="col">Note</th>
                <th scope="col">In Notenpunkten</th>
                <th scope="col">Gesamtschnitt danach</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-line-soft [&_td]:border-t [&_td]:px-3 [&_td]:py-1.5">
              {model.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.halbjahr}</td>
                  <td className="font-bold">{row.fach}</td>
                  <td>{row.leistungsart}</td>
                  <td>{row.note}</td>
                  <td>{row.notenpunkte}</td>
                  <td>{row.average}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    );
  },
);

export type OverviewHeroProps = {
  /** The Halbjahr whose Noten are drawn in red; `null` takes the newest. */
  readonly currentHalbjahrId: string | null;
  /** Every Note of every Halbjahr, in the order they were written. Not empty. */
  readonly entries: ReadonlyArray<TrendEntry>;
  readonly halbjahre: ReadonlyArray<HeroHalbjahr>;
  /** ISO date. */
  readonly today: string;
};

/**
 * The hero of the Übersicht with the Verlauf under it. Both show the same
 * thing: the hero where the Noten balance, the Verlauf where they balanced
 * over time. Moving the hand of the Verlauf shows the hero as it stood on
 * that day.
 */
export const OverviewHero = ({
  currentHalbjahrId,
  entries,
  halbjahre,
  today,
}: OverviewHeroProps) => {
  const total = entries.length;
  const dots = useMemo(
    () => heroDots(entries, halbjahre, currentHalbjahrId),
    [entries, halbjahre, currentHalbjahrId],
  );
  const legend = useMemo(
    () => heroLegend(entries, halbjahre, currentHalbjahrId),
    [entries, halbjahre, currentHalbjahrId],
  );
  const firstCurrent = dots.findIndex((dot) => dot.stratum === 'now');
  // `null` is today. The Übersicht opens on it, every Note already in its place;
  // the sequence in which every Note lands plays only when asked for.
  const [shown, setShown] = useState<number | null>(null);
  const [arrival, setArrival] = useState<Arrival>('fall');
  // While the Noten land one after the other, the caption leaves out the one that landed last.
  const [playing, setPlaying] = useState(false);
  const captionRef = useRef<HTMLDivElement>(null);
  const { start, stop } = usePlay({
    fastUntil: firstCurrent === -1 ? total : firstCurrent,
    total,
    onStep: setShown,
    onDone: () => {
      setShown(null);
      setPlaying(false);
    },
  });

  const count = shown === null ? total : Math.min(shown, total);
  const live = count === total;
  const scrub = (next: number): void => {
    stop();
    setPlaying(false);
    setArrival('drop');
    setShown(next >= total ? null : Math.max(0, next));
  };
  const caption = heroCaption(entries, count);
  const liveSchnitt = entries.at(-1)?.schnitt ?? null;
  const captionRight = liveSchnitt !== null && liveSchnitt < middleOfBar;
  const [first] = entries;

  return (
    <section aria-label="Gesamtschnitt">
      <div className="relative">
        <HeroFigure
          arrival={arrival}
          captionRef={captionRef}
          count={count}
          dots={dots}
          entries={entries}
          label={heroFigureLabel(entries, count)}
        />
        <div
          className={`desk:absolute desk:bottom-1.5 desk:mt-0 mt-2.5 desk:w-[min(25rem,34%)] ${captionRight ? 'desk:right-0' : 'desk:left-0'}`}
          ref={captionRef}
        >
          <p className="font-bold text-xl">{caption.title}</p>
          <p className="mt-1 min-h-[4.35em] text-ink-soft text-sm">
            {caption.text}
            {playing || caption.landed === null ? null : ` ${caption.landed}`}
          </p>
          <Legend items={legend} />
        </div>
      </div>
      <div className="mt-7.5 mb-1.5 flex flex-wrap desk:flex-nowrap items-center gap-x-3.5 gap-y-1">
        <h2 className="desk:mr-0 mr-auto font-bold text-xl">Verlauf</h2>
        <p className="desk:order-none order-last desk:mr-auto basis-full desk:basis-auto text-ink-soft text-sm">
          {first === undefined
            ? null
            : `Wo die Skala seit ${monthText(first.datum)} im Gleichgewicht war. Ziehen dreht die Zeit zurück.`}
        </p>
        {/* Stays in place while today is shown, so nothing shifts and the focus is never lost. */}
        <button
          aria-disabled={live}
          className={buttonClass('quiet', 'compact')}
          onClick={() => {
            if (!live) {
              scrub(total);
            }
          }}
          type="button"
        >
          <Undo2
            aria-hidden={true}
            size={buttonIconSize}
            strokeWidth={iconStroke}
          />
          Heute
        </button>
        <button
          className={`${buttonClass('secondary', 'compact')} motion-reduce:hidden`}
          onClick={() => {
            setArrival('fall');
            setPlaying(true);
            start();
          }}
          type="button"
        >
          <Play
            aria-hidden={true}
            size={buttonIconSize}
            strokeWidth={iconStroke}
          />
          Abspielen
        </button>
      </div>
      <VerlaufBand
        count={count}
        entries={entries}
        halbjahre={halbjahre}
        onScrub={scrub}
        today={today}
        valueText={heroValueText(entries, count)}
      />
      <VerlaufTable entries={entries} />
    </section>
  );
};
