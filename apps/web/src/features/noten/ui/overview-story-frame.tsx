import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';

/**
 * What a block of the Übersicht needs around it in a story: a query client
 * that does not retry, a router for its links (a memory history is enough)
 * and the padding the shell gives a page.
 */
export const OverviewStoryFrame = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [router] = useState(() =>
    createRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      routeTree: createRootRoute({
        component: () => (
          <QueryClientProvider client={queryClient}>
            <main className="mx-auto w-full max-w-[78rem] desk:px-6 px-4 pb-10">
              {children}
            </main>
          </QueryClientProvider>
        ),
      }),
    }),
  );
  return <RouterProvider router={router} />;
};
