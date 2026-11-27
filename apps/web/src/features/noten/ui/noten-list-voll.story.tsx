import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Leistung } from '../services/noten-service.ts';
import { PlainLeistungLink } from './noten-links.story-fixtures.tsx';
import { NotenList } from './noten-list.tsx';
import type { NotenListSearch } from './noten-list-model.ts';
import type { NotenOperations } from './noten-operations.ts';

const today = '2026-11-26';

const halbjahr = {
  endsOn: '2027-01-31',
  id: 'hj-voll',
  startsOn: '2026-08-01',
  system: 'punkte',
} as const;

/** Ein Fach mit langem Namen und vielen Noten, eins nur mit geplanten Leistungen, eins ohne alles. */
const faecher = [
  { id: 'nwt', shortName: 'NwT', name: 'Naturwissenschaft und Technik' },
  { id: 'geschichte', shortName: 'G', name: 'Geschichte' },
  { id: 'kunst', shortName: 'Ku', name: 'Kunst' },
].map((fach) => ({ ...fach, gewichtung: standardgewichtung }));

type Sample = Pick<Leistung, 'kind' | 'datum'> & {
  readonly fach: 'nwt' | 'geschichte';
  readonly wert: number | null;
  readonly notiz?: string;
  readonly gewicht?: number;
};

/**
 * Elf Noten in einem Fach, drei davon auf demselben Wert und je eine an
 * beiden Enden der Skala, dazu drei Leistungen, die noch ausstehen. Eine
 * Notiz ist so lang, wie sie jemand in Eile schreibt, eine andere ein
 * einziges Wort, das breiter ist als die Zeile eines Telefons.
 */
const samples = [
  { fach: 'nwt', kind: 'test', datum: '2026-09-14', wert: 11 },
  { fach: 'nwt', kind: 'muendlich', datum: '2026-09-18', wert: 11 },
  { fach: 'nwt', kind: 'klausur', datum: '2026-09-28', wert: 11 },
  { fach: 'nwt', kind: 'test', datum: '2026-10-02', wert: 15 },
  { fach: 'nwt', kind: 'sonstige', datum: '2026-10-06', wert: 0 },
  {
    fach: 'nwt',
    kind: 'gfs',
    datum: '2026-10-12',
    wert: 13,
    notiz:
      'Brückenbau mit Fachwerk: Präsentation, Modell und schriftliche Ausarbeitung zusammen',
  },
  { fach: 'nwt', kind: 'test', datum: '2026-10-19', wert: 12 },
  { fach: 'nwt', kind: 'muendlich', datum: '2026-10-23', wert: 10 },
  { fach: 'nwt', kind: 'test', datum: '2026-11-09', wert: 9, gewicht: 2 },
  { fach: 'nwt', kind: 'klausur', datum: '2026-11-16', wert: 8 },
  { fach: 'nwt', kind: 'sonstige', datum: '2026-11-20', wert: 14 },
  { fach: 'nwt', kind: 'test', datum: '2026-12-03', wert: null },
  { fach: 'nwt', kind: 'klausur', datum: '2026-12-14', wert: null },
  {
    fach: 'nwt',
    kind: 'gfs',
    datum: '2027-01-18',
    wert: null,
    notiz: 'Elektrizitätswirtschaftsorganisationsgesetz',
  },
  { fach: 'geschichte', kind: 'klausur', datum: '2026-12-08', wert: null },
  { fach: 'geschichte', kind: 'test', datum: '2026-11-18', wert: null },
] satisfies ReadonlyArray<Sample>;

const leistungOf = (sample: Sample, index: number): Leistung => {
  const fach = faecher.find((candidate) => candidate.id === sample.fach);
  const base = {
    datum: sample.datum,
    fachId: sample.fach,
    fachKuerzel: fach?.shortName ?? '',
    fachName: fach?.name ?? '',
    gewicht: sample.gewicht ?? 1,
    gewichtung: standardgewichtung,
    id: `leistung-${index}`,
    kind: sample.kind,
    notiz: sample.notiz ?? null,
  };
  return sample.wert === null
    ? { ...base, status: 'planned' }
    : { ...base, status: 'graded', wert: sample.wert };
};

/** Erfundene Serveraufrufe, die sofort gelingen: hier geht es um das Bild, nicht um den Ablauf. */
const useOperations = (): NotenOperations => {
  const notenRef = useRef<ReadonlyArray<Leistung>>(samples.map(leistungOf));
  return useMemo<NotenOperations>(() => {
    const written = ({
      subjectId,
      wert,
      ...fields
    }: Parameters<NotenOperations['update']>[0]): Leistung => {
      const fach = faecher.find((candidate) => candidate.id === subjectId);
      const base = {
        ...fields,
        fachId: subjectId,
        fachKuerzel: fach?.shortName ?? '',
        fachName: fach?.name ?? '',
        gewichtung: standardgewichtung,
      };
      return wert === null
        ? { ...base, status: 'planned' }
        : { ...base, status: 'graded', wert };
    };
    return {
      create: (values) => {
        notenRef.current = [...notenRef.current, written(values)];
        return Promise.resolve();
      },
      delete: (id) => {
        notenRef.current = notenRef.current.filter((entry) => entry.id !== id);
        return Promise.resolve();
      },
      list: () => Promise.resolve(notenRef.current),
      update: (values) => {
        notenRef.current = notenRef.current.map((entry) =>
          entry.id === values.id ? written(values) : entry,
        );
        return Promise.resolve();
      },
    };
  }, []);
};

const noSearch: NotenListSearch = {};

/** Die Notenliste, wenn ein Fach voll ist und zwei andere fast leer sind. */
export const Voll = () => {
  const [search, setSearch] = useState(noSearch);
  const operations = useOperations();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <main className="mx-auto max-w-[75rem] p-4 desk:px-6">
        <NotenList
          faecher={faecher}
          halbjahr={halbjahr}
          link={PlainLeistungLink}
          onSearch={setSearch}
          operations={operations}
          search={search}
          today={today}
        />
      </main>
    </QueryClientProvider>
  );
};
