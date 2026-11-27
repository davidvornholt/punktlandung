import { useRef } from 'react';
import type {
  Upcoming,
  UpcomingLeistung,
} from '../services/upcoming-calculation.ts';
import { AnstehendRail } from './anstehend-rail.tsx';
import { OverviewStoryFrame } from './overview-story-frame.tsx';

const today = '2026-09-13';

const base: UpcomingLeistung = {
  id: 'mathe-klausur',
  kind: 'klausur',
  datum: '2026-09-19',
  notiz: 'Analysis',
  tageBis: 6,
  anteil: 0.33,
  fachId: 'mathe',
  fachName: 'Mathematik',
  fachKuerzel: 'M',
  fachschnitt: 9,
  system: 'punkte',
  termId: 'hj-1',
  halbjahrLabel: 'J1.1',
};

/** In order of their date: a GFS today, a Test in three days, a Klausur in six. */
const upcoming: ReadonlyArray<UpcomingLeistung> = [
  {
    ...base,
    id: 'deutsch-gfs',
    kind: 'gfs',
    datum: '2026-09-13',
    notiz: null,
    tageBis: 0,
    anteil: 0.5,
    fachId: 'deutsch',
    fachName: 'Deutsch',
    fachKuerzel: 'D',
    fachschnitt: null,
  },
  {
    ...base,
    id: 'englisch-test',
    kind: 'test',
    datum: '2026-09-16',
    notiz: 'Vokabeln',
    tageBis: 3,
    anteil: 0.25,
    fachId: 'englisch',
    fachName: 'Englisch',
    fachKuerzel: 'E',
    fachschnitt: 13,
  },
  base,
];

const overdue: ReadonlyArray<UpcomingLeistung> = [
  {
    ...base,
    id: 'physik-klausur',
    datum: '2026-09-03',
    notiz: null,
    tageBis: -10,
    anteil: 0.4,
    fachId: 'physik',
    fachName: 'Physik',
    fachKuerzel: 'Ph',
  },
];

/**
 * What strains the rail: two Noten missing, three Leistungen on one day, a
 * long Fach name with a long Notiz, and a Klausurenplan that reaches months
 * ahead.
 */
const crowded: Upcoming = {
  overdue: [
    ...overdue,
    {
      ...base,
      id: 'geschichte-test',
      kind: 'test',
      datum: '2026-09-12',
      notiz: null,
      tageBis: -1,
      anteil: 0.5,
      fachId: 'geschichte',
      fachName: 'Geschichte',
      fachKuerzel: 'G',
    },
  ],
  upcoming: [
    ...upcoming.slice(0, 2),
    {
      ...base,
      id: 'physik-test',
      kind: 'test',
      datum: '2026-09-16',
      notiz: null,
      tageBis: 3,
      anteil: 0.125,
      fachId: 'physik',
      fachName: 'Physik',
      fachKuerzel: 'Ph',
    },
    {
      ...base,
      id: 'gk-gfs',
      kind: 'gfs',
      datum: '2026-09-16',
      notiz:
        'Referat: Die Europäische Union zwischen Erweiterung und Vertiefung',
      tageBis: 3,
      anteil: 0.5,
      fachId: 'gk',
      fachName: 'Gemeinschaftskunde und Wirtschaft',
      fachKuerzel: 'GkW',
    },
    base,
    {
      ...base,
      id: 'deutsch-klausur',
      datum: '2026-11-12',
      notiz: 'Textgebundene Erörterung',
      tageBis: 60,
      anteil: 0.3,
      fachId: 'deutsch',
      fachName: 'Deutsch',
      fachKuerzel: 'D',
    },
    {
      ...base,
      id: 'englisch-klausur',
      datum: '2027-01-11',
      notiz: null,
      tageBis: 120,
      anteil: 0.25,
      fachId: 'englisch',
      fachName: 'Englisch',
      fachKuerzel: 'E',
    },
  ],
};

const Scenario = ({ load }: { readonly load: () => Promise<Upcoming> }) => (
  <OverviewStoryFrame>
    <AnstehendRail load={load} today={today} />
  </OverviewStoryFrame>
);

export const Anstehend = () => (
  <Scenario load={() => Promise.resolve({ upcoming, overdue: [] })} />
);

export const MitFehlenderNote = () => (
  <Scenario load={() => Promise.resolve({ upcoming, overdue })} />
);

export const Voll = () => <Scenario load={() => Promise.resolve(crowded)} />;

export const Leer = () => (
  <Scenario load={() => Promise.resolve({ upcoming: [], overdue: [] })} />
);

/** The first load fails like a dropped connection; the retry succeeds. */
export const LadenScheitert = () => {
  const loadsRef = useRef(0);
  return (
    <Scenario
      load={() => {
        loadsRef.current += 1;
        return loadsRef.current === 1
          ? Promise.reject(new Error('offline'))
          : Promise.resolve({ upcoming, overdue: [] });
      }}
    />
  );
};
