import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { createQueryContext } from '#/shared/query/query-context.ts';
import {
  LoadErrorNotice,
  StandaloneNotFound,
} from '#/shared/ui/shell-states.tsx';
import { routeTree } from './routeTree.gen';

export const getRouter = () => {
  const context = createQueryContext();

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // A change of page is animated; a change of what one page shows, such as its Halbjahr, is not.
    defaultViewTransition: {
      types: ({ pathChanged }) => (pathChanged ? ['page'] : false),
    },
    // An address that matches no route has no shell around it, so the notice stands alone.
    defaultNotFoundComponent: StandaloneNotFound,
    // A page that fails to load says so inside the shell, which keeps working.
    defaultErrorComponent: LoadErrorNotice,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
};

declare module '@tanstack/react-router' {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router verlangt Interface-Merging für die Router-Registrierung.
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
