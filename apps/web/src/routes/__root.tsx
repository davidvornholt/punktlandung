import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { tanstackQueryDevtoolsPlugin } from '#/shared/query/devtools.tsx';
import appCss from '../styles.css?url';

type RouterContext = {
  readonly queryClient: QueryClient;
};

const RootDocument = ({ children }: { readonly children: React.ReactNode }) => (
  <html lang="de">
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <TanStackDevtools
        config={{ position: 'bottom-right' }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
          tanstackQueryDevtoolsPlugin,
        ]}
      />
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Punktlandung' },
      {
        name: 'description',
        content:
          'Punktlandung — persönlicher Notenüberblick für das Gymnasium: Noten erfassen, Schnitte verfolgen, Zeugnis im Blick behalten.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
});
