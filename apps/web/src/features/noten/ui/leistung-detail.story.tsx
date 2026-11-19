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
import { LeistungDetail } from './leistung-detail.tsx';
import type { LeistungOperations } from './leistung-operations.ts';
import type { NotenOperations } from './noten-operations.ts';

type Scenario = 'ausstehend' | 'benotet';

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
  };
  return scenario === 'benotet'
    ? { ...base, status: 'graded', wert: 11 }
    : { ...base, status: 'planned' };
};

/** Steht für alles, was die Leistung neu lädt, etwa die Rückkehr in den Tab. */
const RefreshStub = () => {
  const queryClient = useQueryClient();
  return (
    <button
      onClick={() =>
        queryClient.invalidateQueries({ queryKey: leistungKey('k-1') })
      }
      type="button"
    >
      Neu laden
    </button>
  );
};

/** Wie sich der erfundene Server verhält. Ohne Angaben gelingt jeder Aufruf sofort. */
type ServerBehaviour = {
  /** Nach dem ersten Laden scheitert jedes weitere, wie bei einem Verbindungsabbruch. */
  readonly refreshFails?: boolean;
};

/** Die Detailseite mit erfundenen Serveraufrufen. */
const LeistungDetailScenario = ({
  scenario,
  refreshFails = false,
}: ServerBehaviour & { readonly scenario: Scenario }) => {
  const leistungRef = useRef<Leistung>(initialLeistung(scenario));
  const loadsRef = useRef(0);
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
            } satisfies Detail);
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
              <RefreshStub />
              <LeistungDetail
                faecher={faecher}
                leistungId="k-1"
                leistungOperations={leistungOperations}
                notenOperations={notenOperations}
              />
            </main>
          </QueryClientProvider>
        ),
      }),
    }),
  );
  return <RouterProvider router={router} />;
};

export const Ausstehend = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="ausstehend" />
);

export const Benotet = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="benotet" />
);
