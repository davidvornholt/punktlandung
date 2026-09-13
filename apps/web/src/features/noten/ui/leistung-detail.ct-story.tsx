import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type {
  LeistungDetail as Detail,
  Leistung,
} from '../services/noten-service.ts';
import { defaultPreparationTemplate } from '../services/preparation-template-service.ts';
import { themen } from './leistung-detail.ct-fixtures.ts';
import { LeistungDetail } from './leistung-detail.tsx';
import type { LeistungOperations } from './leistung-operations.ts';
import type { NotenOperations } from './noten-operations.ts';

type Scenario = 'ohne-vorbereitung' | 'mit-themen' | 'benotet';

const halbjahr = {
  endsOn: '2027-01-31',
  id: 'hj-1',
  label: 'J1.1',
  schoolYear: '2026/27',
  startsOn: '2026-09-01',
  system: 'punkte',
} as const;

const faecher = [
  { id: 'mathe', name: 'Mathematik' },
  { id: 'englisch', name: 'Englisch' },
];

const initialLeistung = (scenario: Scenario): Leistung => {
  const base = {
    datum: '2026-09-19',
    fachId: 'mathe',
    fachKuerzel: 'M',
    fachName: 'Mathematik',
    gewicht: 1,
    gewichtung: standardgewichtung,
    id: 'k-1',
    kind: 'klausur' as const,
    notiz: null,
    preparation: scenario === 'ohne-vorbereitung' ? null : themen,
  };
  return scenario === 'benotet'
    ? { ...base, status: 'graded', wert: 11 }
    : { ...base, status: 'planned' };
};

/**
 * Die Detailseite mit erfundenen Serveraufrufen. Der Verlauf der Aufrufe
 * steht in einer Liste im DOM, damit ein Test prüfen kann, welcher Quelltext
 * gespeichert wurde.
 */
export const LeistungDetailStory = ({
  scenario = 'mit-themen',
}: {
  readonly scenario?: Scenario;
}) => {
  const leistungRef = useRef<Leistung>(initialLeistung(scenario));
  const [saved, setSaved] = useState<ReadonlyArray<string>>([]);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      }),
  );
  const leistungOperations = useMemo<LeistungOperations>(
    () => ({
      load: () =>
        Promise.resolve({
          halbjahr,
          leistung: leistungRef.current,
          lernen: { daysAgo: 4, inLastWeek: 1 },
        } satisfies Detail),
      loadTemplates: () =>
        Promise.resolve({
          klausur: defaultPreparationTemplate,
          test: defaultPreparationTemplate,
          gfs: '- [ ] Handout',
        }),
      saveTemplate: () => Promise.resolve(),
      updatePreparation: (input) => {
        leistungRef.current = {
          ...leistungRef.current,
          preparation: input.preparation,
        };
        setSaved((list) => [...list, input.preparation ?? '<null>']);
        return Promise.resolve();
      },
    }),
    [],
  );
  const notenOperations = useMemo<NotenOperations>(
    () => ({
      create: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      list: () => Promise.resolve([leistungRef.current]),
      update: (values) => {
        const { wert, id: _id, ...fields } = values;
        leistungRef.current =
          wert === null
            ? { ...leistungRef.current, ...fields, status: 'planned' }
            : { ...leistungRef.current, ...fields, status: 'graded', wert };
        return Promise.resolve();
      },
    }),
    [],
  );
  const [router] = useState(() =>
    createRouter({
      history: createMemoryHistory({ initialEntries: ['/noten/k-1'] }),
      routeTree: createRootRoute({
        component: () => (
          <QueryClientProvider client={queryClient}>
            <main className="p-4">
              <LeistungDetail
                faecher={faecher}
                leistungId="k-1"
                leistungOperations={leistungOperations}
                lerntag={() => <p>Lerntag-Baustein</p>}
                notenOperations={notenOperations}
              />
            </main>
          </QueryClientProvider>
        ),
      }),
    }),
  );
  /*
   * Der Verlauf steht außerhalb des Routers: dessen Wurzelkomponente ist
   * einmal gebaut und sähe nur den ersten Stand von `saved`.
   */
  return (
    <>
      <RouterProvider router={router} />
      <ol aria-label="Gespeicherte Vorbereitungen" hidden={true}>
        {saved.map((entry, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Der Verlauf wird nur angehängt, nie umsortiert.
          <li key={index}>{entry}</li>
        ))}
      </ol>
    </>
  );
};
