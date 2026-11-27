import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { type Leistungsart, toNotenpunkte } from '#/shared/noten/notenwert.ts';
import {
  calculateTrend,
  type TrendEntry,
} from '../services/trend-calculation.ts';
import { OverviewHero } from './overview-hero.tsx';

const today = '2026-11-26';

const faecher = {
  deutsch: { name: 'Deutsch', short: 'D' },
  mathe: { name: 'Mathematik', short: 'M' },
  englisch: { name: 'Englisch', short: 'E' },
} as const;

const terms = {
  k101: {
    klassenstufe: '10',
    half: 1,
    system: 'sechser',
    schoolYear: '2025/26',
  },
  k102: {
    klassenstufe: '10',
    half: 2,
    system: 'sechser',
    schoolYear: '2025/26',
  },
  j11: { klassenstufe: 'J1', half: 1, system: 'punkte', schoolYear: '2026/27' },
} as const;

/** Newest first, as the app lists them. */
const halbjahre = [
  { id: 'j11', label: 'J1.1', startsOn: '2026-09-14' },
  { id: 'k102', label: '10.2', startsOn: '2026-02-02' },
  { id: 'k101', label: '10.1', startsOn: '2025-09-15' },
];

type Sample = {
  readonly id: string;
  readonly term: keyof typeof terms;
  readonly date: string;
  readonly fach: keyof typeof faecher;
  /** In the Notensystem of the Halbjahr. */
  readonly wert: number;
  readonly art?: Leistungsart;
};

const trend = (samples: ReadonlyArray<Sample>): ReadonlyArray<TrendEntry> =>
  calculateTrend(
    samples.map((sample) => {
      const term = terms[sample.term];
      const fach = faecher[sample.fach];
      return {
        id: sample.id,
        date: sample.date,
        notenpunkte: toNotenpunkte(sample.wert, term.system),
        notenwert: sample.wert,
        notensystem: term.system,
        individualGewichtung: 1,
        fachId: sample.fach,
        fachSnapshotId: `${term.schoolYear}:${sample.fach}`,
        fachShortName: fach.short,
        fachName: fach.name,
        leistungsart: sample.art ?? 'klausur',
        fachGewichtung: standardgewichtung,
        halbjahrId: sample.term,
        klassenstufe: term.klassenstufe,
        half: term.half,
      };
    }),
  );

/** Twelve Noten over three Halbjahre; the last five are this Halbjahr's, one of them mündlich. */
const verlauf = trend([
  { id: 'a1', term: 'k101', date: '2025-10-02', fach: 'deutsch', wert: 2.5 },
  { id: 'a2', term: 'k101', date: '2025-10-20', fach: 'mathe', wert: 3 },
  {
    id: 'a3',
    term: 'k101',
    date: '2025-11-12',
    fach: 'englisch',
    wert: 2,
    art: 'test',
  },
  { id: 'a4', term: 'k101', date: '2025-12-10', fach: 'mathe', wert: 2.25 },
  { id: 'b1', term: 'k102', date: '2026-03-03', fach: 'deutsch', wert: 2 },
  { id: 'b2', term: 'k102', date: '2026-04-21', fach: 'englisch', wert: 3.5 },
  {
    id: 'b3',
    term: 'k102',
    date: '2026-05-19',
    fach: 'mathe',
    wert: 1.75,
    art: 'test',
  },
  { id: 'c1', term: 'j11', date: '2026-09-28', fach: 'mathe', wert: 11 },
  {
    id: 'c2',
    term: 'j11',
    date: '2026-10-06',
    fach: 'englisch',
    wert: 12,
    art: 'test',
  },
  {
    id: 'c3',
    term: 'j11',
    date: '2026-10-30',
    fach: 'deutsch',
    wert: 9,
    art: 'muendlich',
  },
  { id: 'c4', term: 'j11', date: '2026-11-05', fach: 'deutsch', wert: 12 },
  { id: 'c5', term: 'j11', date: '2026-11-19', fach: 'mathe', wert: 10 },
]);

/** A Gesamtschnitt in the left half of the bar: the caption moves to the right. */
const schwach = trend([
  { id: 's1', term: 'j11', date: '2026-09-28', fach: 'mathe', wert: 4 },
  { id: 's2', term: 'j11', date: '2026-10-06', fach: 'englisch', wert: 6 },
  { id: 's3', term: 'j11', date: '2026-11-05', fach: 'deutsch', wert: 5 },
]);

const Scenario = ({
  entries,
}: {
  readonly entries: ReadonlyArray<TrendEntry>;
}) => (
  <main className="mx-auto w-full max-w-[78rem] desk:px-6 px-4 pb-10">
    <OverviewHero
      currentHalbjahrId="j11"
      entries={entries}
      halbjahre={halbjahre}
      today={today}
    />
  </main>
);

export const Verlauf = () => <Scenario entries={verlauf} />;

export const SchwacherSchnitt = () => <Scenario entries={schwach} />;

export const ErsteNote = () => <Scenario entries={verlauf.slice(0, 1)} />;
