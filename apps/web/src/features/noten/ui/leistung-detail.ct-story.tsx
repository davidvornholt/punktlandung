import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { leistungKey } from '#/shared/query/query-keys.ts';
import type {
  LeistungDetail as Detail,
  Leistung,
} from '../services/noten-service.ts';
import { defaultPreparationTemplate } from '../services/preparation-template-service.ts';
import { gleichartigeThemen, themen } from './leistung-detail.ct-fixtures.ts';
import { LeistungDetail } from './leistung-detail.tsx';
import type { LeistungOperations } from './leistung-operations.ts';
import type { NotenOperations } from './noten-operations.ts';

type Scenario =
  | 'ohne-vorbereitung'
  | 'mit-themen'
  | 'gleichartige-themen'
  | 'benotet';

const preparationForScenario = (scenario: Scenario): string | null => {
  if (scenario === 'ohne-vorbereitung') {
    return null;
  }
  if (scenario === 'gleichartige-themen') {
    return gleichartigeThemen;
  }
  return themen;
};

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
    preparation: preparationForScenario(scenario),
  };
  return scenario === 'benotet'
    ? { ...base, status: 'graded', wert: 11 }
    : { ...base, status: 'planned' };
};

/**
 * Steht für den Lerntag-Baustein, der nach „Heute dafür gelernt“ die Leistung
 * neu lädt.
 */
const LerntagStub = () => {
  const queryClient = useQueryClient();
  return (
    <button
      onClick={() =>
        queryClient.invalidateQueries({ queryKey: leistungKey('k-1') })
      }
      type="button"
    >
      Lerntag-Baustein
    </button>
  );
};

/**
 * Die Detailseite mit erfundenen Serveraufrufen. Der Verlauf der Aufrufe
 * steht in einer Liste im DOM, damit ein Test prüfen kann, welcher Quelltext
 * gespeichert wurde.
 */
export const LeistungDetailStory = ({
  scenario = 'mit-themen',
  refreshFails = false,
}: {
  readonly scenario?: Scenario;
  /** Nach dem ersten Laden scheitert jedes weitere, wie bei einem Verbindungsabbruch. */
  readonly refreshFails?: boolean;
}) => {
  const leistungRef = useRef<Leistung>(initialLeistung(scenario));
  const loadsRef = useRef(0);
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
      load: () => {
        loadsRef.current += 1;
        return refreshFails && loadsRef.current > 1
          ? Promise.reject(new Error('Verbindung unterbrochen'))
          : Promise.resolve({
              halbjahr,
              leistung: leistungRef.current,
              lernen: { daysAgo: 4, inLastWeek: 1 },
            } satisfies Detail);
      },
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
    [refreshFails],
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
                lerntag={() => <LerntagStub />}
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
