import { useRef } from 'react';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Leistung } from '../services/noten-service.ts';
import { OverviewFaecher } from './overview-faecher.tsx';
import type { OverviewFach } from './overview-faecher-model.ts';
import { OverviewStoryFrame } from './overview-story-frame.tsx';

const today = '2026-11-26';

const halbjahr = {
  id: 'hj-1',
  label: 'J1.1',
  schoolYear: '2026/27',
  system: 'punkte',
} as const;

const faecher: ReadonlyArray<OverviewFach> = [
  { id: 'deutsch', name: 'Deutsch', gewichtung: standardgewichtung },
  { id: 'mathe', name: 'Mathematik', gewichtung: standardgewichtung },
  { id: 'chemie', name: 'Chemie', gewichtung: standardgewichtung },
];

const deutsch = {
  datum: '2026-10-12',
  fachId: 'deutsch',
  fachKuerzel: 'D',
  fachName: 'Deutsch',
  gewicht: 1,
  gewichtung: standardgewichtung,
  kind: 'klausur',
  notiz: null,
} as const;

const mathe = {
  ...deutsch,
  fachId: 'mathe',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
} as const;

/** Deutsch has two Noten and a Klausur to come, Mathematik one Note and one that is missing, Chemie nothing. */
const leistungen: ReadonlyArray<Leistung> = [
  { ...deutsch, id: 'd1', status: 'graded', wert: 12 },
  {
    ...deutsch,
    id: 'd2',
    datum: '2026-10-30',
    kind: 'muendlich',
    status: 'graded',
    wert: 9,
  },
  { ...deutsch, id: 'd3', datum: '2026-12-12', status: 'planned' },
  { ...mathe, id: 'm1', datum: '2026-09-28', status: 'graded', wert: 11 },
  { ...mathe, id: 'm2', datum: '2026-11-20', kind: 'test', status: 'planned' },
];

const loadsFaecher = () => Promise.resolve(faecher);

const loadsLeistungen = () => Promise.resolve(leistungen);

const Scenario = ({
  loadFaecher = loadsFaecher,
  loadNoten = loadsLeistungen,
}: {
  readonly loadFaecher?: () => Promise<ReadonlyArray<OverviewFach>>;
  readonly loadNoten?: () => Promise<ReadonlyArray<Leistung>>;
}) => (
  <OverviewStoryFrame>
    <OverviewFaecher
      halbjahr={halbjahr}
      loadFaecher={loadFaecher}
      loadNoten={loadNoten}
      today={today}
    />
  </OverviewStoryFrame>
);

export const Faecher = () => <Scenario />;

export const OhneFaecher = () => (
  <Scenario
    loadFaecher={() => Promise.resolve([])}
    loadNoten={() => Promise.resolve([])}
  />
);

/** The Noten fail to load once, like a dropped connection; the retry succeeds. */
export const LadenScheitert = () => {
  const loadsRef = useRef(0);
  return (
    <Scenario
      loadNoten={() => {
        loadsRef.current += 1;
        return loadsRef.current === 1
          ? Promise.reject(new Error('offline'))
          : Promise.resolve(leistungen);
      }}
    />
  );
};
