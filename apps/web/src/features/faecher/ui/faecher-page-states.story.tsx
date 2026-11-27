import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import type { Fach } from '../services/fach-service.ts';
import { FaecherPage, type FaecherPageOperations } from './faecher-page.tsx';

type Halbjahre = Awaited<ReturnType<FaecherPageOperations['listHalbjahre']>>;
type Store = Readonly<Record<string, ReadonlyArray<Fach>>>;

const kursstufe = '2026/27';
const mittelstufe = '2025/26';

const zweiSchuljahre: Halbjahre = [
  { schoolYear: kursstufe, system: 'punkte' },
  { schoolYear: mittelstufe, system: 'sechser' },
];

/** Fächer whose Gewichtungen differ in everything a row can show. */
const faecher = {
  [kursstufe]: [
    {
      gewichtung: {
        verhaeltnis: { schriftlich: 2, muendlich: 1 },
        arten: standardgewichtung.arten,
      },
      id: 'mathe',
      name: 'Mathematik',
      shortName: 'M',
      sortOrder: 0,
    },
    {
      gewichtung: {
        verhaeltnis: { schriftlich: 60, muendlich: 40 },
        arten: {
          ...standardgewichtung.arten,
          klausur: { gewicht: 2, sammlung: 'einzeln' },
          test: { gewicht: 1, sammlung: 'einzeln' },
        },
      },
      id: 'deutsch',
      name: 'Deutsch',
      shortName: 'D',
      sortOrder: 1,
    },
    {
      gewichtung: standardgewichtung,
      id: 'englisch',
      name: 'Englisch',
      shortName: 'E',
      sortOrder: 2,
    },
    {
      gewichtung: {
        verhaeltnis: null,
        arten: {
          ...standardgewichtung.arten,
          test: { gewicht: 0.5, sammlung: 'einzeln' },
          sonstige: { gewicht: 0.5, sammlung: 'einzeln' },
        },
      },
      id: 'gemeinschaftskunde',
      name: 'Gemeinschaftskunde',
      shortName: 'Gk',
      sortOrder: 3,
    },
  ],
  [mittelstufe]: [
    {
      gewichtung: {
        verhaeltnis: { schriftlich: 1, muendlich: 1 },
        arten: standardgewichtung.arten,
      },
      id: 'biologie',
      name: 'Biologie',
      shortName: 'Bio',
      sortOrder: 0,
    },
  ],
} as const satisfies Store;

const saveFailure = () =>
  Promise.reject(new Error('Der Server ist nicht erreichbar.'));

/** The page on Fächer kept in memory, so what is saved shows up in the list. */
const useMemoryOperations = ({
  failSave,
  halbjahre,
  initial,
}: {
  readonly failSave: boolean;
  readonly halbjahre: Promise<Halbjahre>;
  readonly initial: Store;
}): FaecherPageOperations => {
  const storeRef = useRef<Store>(initial);
  return useMemo(() => {
    const write = (
      schoolYear: string,
      change: (current: ReadonlyArray<Fach>) => ReadonlyArray<Fach>,
    ) => {
      if (failSave) {
        return saveFailure();
      }
      storeRef.current = {
        ...storeRef.current,
        [schoolYear]: change(storeRef.current[schoolYear] ?? []),
      };
      return Promise.resolve();
    };
    return {
      archive: ({ id, schoolYear }) =>
        write(schoolYear, (current) =>
          current.filter((fach) => fach.id !== id),
        ),
      create: ({ schoolYear, ...fields }) =>
        write(schoolYear, (current) => [
          ...current,
          { ...fields, id: `neu-${current.length}`, sortOrder: current.length },
        ]),
      list: (schoolYear) => Promise.resolve(storeRef.current[schoolYear] ?? []),
      listHalbjahre: () => halbjahre,
      update: ({ id, schoolYear, ...fields }) =>
        write(schoolYear, (current) =>
          current.map((fach) =>
            fach.id === id ? { ...fach, ...fields } : fach,
          ),
        ),
    };
  }, [failSave, halbjahre]);
};

const neverLoaded = new Promise<Halbjahre>(() => undefined);

const FaecherPageState = ({
  failSave = false,
  halbjahre = zweiSchuljahre,
  initial = faecher,
  loading = false,
}: {
  readonly failSave?: boolean;
  readonly halbjahre?: Halbjahre;
  readonly initial?: Store;
  readonly loading?: boolean;
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      }),
  );
  const loaded = useMemo(() => Promise.resolve(halbjahre), [halbjahre]);
  const operations = useMemoryOperations({
    failSave,
    halbjahre: loading ? neverLoaded : loaded,
    initial,
  });
  return (
    <QueryClientProvider client={queryClient}>
      {/* The room the app's shell gives a page. */}
      <main className="mx-auto w-full max-w-[78rem] desk:px-6 px-4 pb-10">
        <FaecherPage
          noHalbjahrAction={
            <a className={primaryButtonClass} href="#einstellungen">
              Zu den Einstellungen
            </a>
          }
          operations={operations}
        />
      </main>
    </QueryClientProvider>
  );
};

const leer: Store = {};
const vierSchuljahre: Halbjahre = [
  ...zweiSchuljahre,
  { schoolYear: '2024/25', system: 'sechser' },
  { schoolYear: '2023/24', system: 'sechser' },
];
const einSchuljahr: Halbjahre = [{ schoolYear: kursstufe, system: 'punkte' }];
const keinHalbjahr: Halbjahre = [];

/** Two Schuljahre: the Kursstufe in Notenpunkte and the year before in Noten. */
export const Schuljahre = () => <FaecherPageState />;

/** More Schuljahre than fit beside each other: the choice becomes a list to open. */
export const VieleSchuljahre = () => (
  <FaecherPageState halbjahre={vierSchuljahre} />
);

export const KeineFaecher = () => (
  <FaecherPageState halbjahre={einSchuljahr} initial={leer} />
);

export const KeinHalbjahr = () => (
  <FaecherPageState halbjahre={keinHalbjahr} initial={leer} />
);

export const Laedt = () => <FaecherPageState loading={true} />;

/** Saving and archiving fail, so the form and the row show what went wrong. */
export const SpeichernScheitert = () => <FaecherPageState failSave={true} />;
