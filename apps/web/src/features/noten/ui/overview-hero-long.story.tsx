import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import {
  type Leistungsart,
  type Notensystem,
  toNotenpunkte,
} from '#/shared/noten/notenwert.ts';
import {
  type Klassenstufe,
  klassenstufen,
  notensystemForKlassenstufe,
} from '#/shared/school/klassenstufe.ts';
import {
  calculateTrend,
  type TrendEntry,
  type TrendNote,
} from '../services/trend-calculation.ts';
import { OverviewHero } from './overview-hero.tsx';

const today = '2026-11-26';

const faecher = [
  'D',
  'M',
  'E',
  'F',
  'Bio',
  'Ch',
  'Ph',
  'G',
  'Geo',
  'Rel',
  'Mu',
  'BK',
] as const;

/** The numbers the made-up history is drawn with. */
const made = {
  firstSchoolYear: 2019,
  /** A Halbjahr's Noten fall on its first days, as many as these. */
  days: { full: 140, j2: 56 },
  firstHalf: '-09-15',
  secondHalf: '-02-02',
  /** Notenpunkte 6 to 15 in the Kursstufe. */
  punkte: { lowest: 6, span: 9 },
  /** Noten 1 to 4,5 in quarters below it. */
  sechser: { best: 1, span: 3.5, steps: 4 },
  /** A linear congruential generator, so every run draws the same Noten. */
  lcg: { multiplier: 1_103_515_245, increment: 12_345, modulus: 2_147_483_648 },
  dayMs: 86_400_000,
  isoDate: 10,
} as const;

/** A fixed sequence of numbers between 0 and 1. */
const random = (seed: number) => {
  let state = seed;
  return () => {
    state =
      (state * made.lcg.multiplier + made.lcg.increment) % made.lcg.modulus;
    return state / made.lcg.modulus;
  };
};

const arten: ReadonlyArray<Leistungsart> = [
  'klausur',
  'test',
  'klausur',
  'muendlich',
];

const plusDays = (date: string, days: number): string =>
  new Date(Date.parse(date) + days * made.dayMs)
    .toISOString()
    .slice(0, made.isoDate);

type MadeHalbjahr = { id: string; label: string; startsOn: string };

/** The Halbjahre from Klasse 5 to J2.1, the one going on. */
const halbjahreSoFar = (): ReadonlyArray<
  MadeHalbjahr & { klassenstufe: Klassenstufe; half: 1 | 2; schoolYear: string }
> =>
  klassenstufen.flatMap((klassenstufe, year) => {
    const startYear = made.firstSchoolYear + year;
    const schoolYear = `${startYear}/${String(startYear + 1).slice(-2)}`;
    const halves = klassenstufe === 'J2' ? ([1] as const) : ([1, 2] as const);
    return halves.map((half) => {
      const id = `${klassenstufe}.${half}`;
      const startsOn =
        half === 1
          ? `${startYear}${made.firstHalf}`
          : `${startYear + 1}${made.secondHalf}`;
      return { id, label: id, startsOn, klassenstufe, half, schoolYear };
    });
  });

/** A Note drawn for the Notensystem of its Halbjahr. */
const wertIn = (system: Notensystem, next: () => number): number =>
  system === 'punkte'
    ? Math.round(made.punkte.lowest + next() * made.punkte.span)
    : Math.round(
        (made.sechser.best + next() * made.sechser.span) * made.sechser.steps,
      ) / made.sechser.steps;

/**
 * A pupil's whole time at the Gymnasium, from Klasse 5 to J2.1: twelve Fächer
 * with `perFach` Noten in each Halbjahr, made up.
 */
const history = (perFach: number) => {
  const next = random(perFach);
  const halbjahre = halbjahreSoFar();
  const perHalbjahr = perFach * faecher.length;
  const noten = halbjahre.flatMap((halbjahr): Array<TrendNote> => {
    const system = notensystemForKlassenstufe(halbjahr.klassenstufe);
    const days = halbjahr.klassenstufe === 'J2' ? made.days.j2 : made.days.full;
    return Array.from({ length: perHalbjahr }, (_, index) => {
      const fach = faecher[index % faecher.length] ?? 'D';
      const wert = wertIn(system, next);
      return {
        id: `${halbjahr.id}-${index}`,
        date: plusDays(
          halbjahr.startsOn,
          Math.floor((index / perHalbjahr) * days),
        ),
        notenpunkte: toNotenpunkte(wert, system),
        notenwert: wert,
        notensystem: system,
        individualGewichtung: 1,
        fachId: fach,
        fachSnapshotId: `${halbjahr.schoolYear}:${fach}`,
        fachShortName: fach,
        fachName: fach,
        leistungsart:
          arten[Math.floor(index / faecher.length) % arten.length] ?? 'klausur',
        fachGewichtung: standardgewichtung,
        halbjahrId: halbjahr.id,
        klassenstufe: halbjahr.klassenstufe,
        half: halbjahr.half,
      };
    });
  });
  noten.sort((left, right) => left.date.localeCompare(right.date));
  return {
    entries: calculateTrend(noten),
    halbjahre: halbjahre
      .map(({ id, label, startsOn }) => ({ id, label, startsOn }))
      .reverse(),
  };
};

const Scenario = ({
  entries,
  halbjahre,
}: {
  readonly entries: ReadonlyArray<TrendEntry>;
  readonly halbjahre: ReadonlyArray<MadeHalbjahr>;
}) => (
  <main className="mx-auto w-full max-w-[78rem] desk:px-6 px-4 pb-10">
    <OverviewHero
      currentHalbjahrId="J2.1"
      entries={entries}
      halbjahre={halbjahre}
      today={today}
    />
  </main>
);

/** How many Noten each Fach has in a Halbjahr. */
const notenPerFach = { lang: 3, sehrLang: 5 } as const;

const lang = history(notenPerFach.lang);
const sehrLang = history(notenPerFach.sehrLang);

/**
 * 12 Fächer × 3 Noten in each of the 15 Halbjahre from Klasse 5 to J2.1:
 * 540 Noten, a long history to scrub and play on a slow phone.
 */
export const LangerVerlauf = () => <Scenario {...lang} />;

/** 12 Fächer × 5 Noten in each Halbjahr: 900 Noten. */
export const SehrLangerVerlauf = () => <Scenario {...sehrLang} />;
