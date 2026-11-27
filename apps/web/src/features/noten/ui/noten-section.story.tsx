import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useState } from 'react';

import { PlainLeistungLink } from './noten-links.story-fixtures.tsx';
import type { NotenOperations } from './noten-operations.ts';
import { NotenSection } from './noten-section.tsx';

const halbjahr = {
  endsOn: '2027-01-31',
  id: 'hj-1',
  startsOn: '2026-08-01',
  system: 'punkte',
} as const;

const operations: NotenOperations = {
  create: () => Promise.resolve(),
  delete: () => Promise.resolve(),
  list: () => Promise.resolve([]),
  update: () => Promise.resolve(),
};

const noSearch = {} as const;

/**
 * Der Notenteil eines Schuljahrs, in dem noch kein Fach angelegt ist. Der
 * Hinweis verweist mit einem Router-Link auf die Fächer und braucht deshalb
 * einen Router; ein Speicherverlauf reicht.
 */
export const OhneFach = () => {
  const [queryClient] = useState(() => new QueryClient());
  const [router] = useState(() =>
    createRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      routeTree: createRootRoute({
        component: () => (
          <main className="mx-auto max-w-[75rem] p-4 desk:px-6">
            <NotenSection
              faecher={[]}
              halbjahr={halbjahr}
              link={PlainLeistungLink}
              onSearch={() => undefined}
              operations={operations}
              search={noSearch}
              today="2026-11-26"
            />
          </main>
        ),
      }),
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};
