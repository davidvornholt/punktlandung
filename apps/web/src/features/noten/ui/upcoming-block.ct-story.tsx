import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useState } from 'react';

import type {
  Upcoming,
  UpcomingLeistung,
} from '../services/upcoming-calculation.ts';
import { UpcomingBlock } from './upcoming-block.tsx';

type Scenario = 'leer' | 'anstehend' | 'mit-ueberfaelligem';

const leistung = (
  id: string,
  overrides: Partial<UpcomingLeistung>,
): UpcomingLeistung => ({
  id,
  kind: 'klausur',
  datum: '2026-09-19',
  tageBis: 6,
  fachId: 'mathe',
  fachName: 'Mathematik',
  fachKuerzel: 'M',
  fachschnitt: 9,
  topics: null,
  system: 'punkte',
  termId: 'hj-1',
  halbjahrLabel: 'J1.1',
  ...overrides,
});

/* Sechs Tage bis zur Klausur, drei bis zum Test — die Klausur steht trotzdem vorn. */
const tageBisTest = 3;
const englischSchnitt = 13;
const tageSeitPhysik = -10;

const upcoming: Upcoming = {
  upcoming: [
    leistung('mathe-klausur', { topics: { total: 7, checked: 2 } }),
    leistung('englisch-test', {
      kind: 'test',
      datum: '2026-09-16',
      tageBis: tageBisTest,
      fachId: 'englisch',
      fachName: 'Englisch',
      fachKuerzel: 'E',
      fachschnitt: englischSchnitt,
    }),
    leistung('deutsch-gfs', {
      kind: 'gfs',
      datum: '2026-09-13',
      tageBis: 0,
      fachId: 'deutsch',
      fachName: 'Deutsch',
      fachKuerzel: 'D',
      fachschnitt: null,
    }),
  ],
  overdue: [
    leistung('physik-klausur', {
      datum: '2026-09-03',
      tageBis: tageSeitPhysik,
      fachId: 'physik',
      fachName: 'Physik',
      fachKuerzel: 'Ph',
    }),
  ],
};

const data = (scenario: Scenario): Upcoming => {
  if (scenario === 'leer') {
    return { upcoming: [], overdue: [] };
  }
  return scenario === 'anstehend' ? { ...upcoming, overdue: [] } : upcoming;
};

/**
 * Der Anstehend-Block mit erfundenen Daten. Der Verweis „Note eintragen" ist
 * ein Router-Link und braucht einen Router; ein Speicherverlauf reicht.
 */
export const UpcomingBlockStory = ({
  scenario = 'anstehend',
}: {
  readonly scenario?: Scenario;
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
  );
  const [router] = useState(() =>
    createRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      routeTree: createRootRoute({
        component: () => (
          <QueryClientProvider client={queryClient}>
            <main className="p-4">
              <UpcomingBlock load={() => Promise.resolve(data(scenario))} />
            </main>
          </QueryClientProvider>
        ),
      }),
    }),
  );
  return <RouterProvider router={router} />;
};
