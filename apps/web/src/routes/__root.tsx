import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { tanstackQueryDevtoolsPlugin } from '#/shared/query/devtools.tsx';
import { useRecolouring } from '#/shared/ui/recolouring.ts';
import appCss from '../styles.css?url';

type RouterContext = {
  readonly queryClient: QueryClient;
};

/** The colour of `paper` in the two themes of packages/ui/src/theme.css, for the browser's own chrome. */
const paper = { light: '#e5f2fd', dark: '#1a2533' } as const;

const RootDocument = ({ children }: { readonly children: React.ReactNode }) => {
  useRecolouring();
  return (
    <html lang="de">
      <head>
        {/* The router keeps one meta tag per name, and the browser's own chrome needs one colour per scheme, so these two stand here. */}
        <meta
          content={paper.light}
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content={paper.dark}
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
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
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        // `viewport-fit=cover` lets the tab bar of a phone keep clear of the home indicator.
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'color-scheme', content: 'light dark' },
      { title: 'Punktlandung' },
      {
        name: 'description',
        content:
          'Punktlandung: jede Note auf einer Skala, und der Schnitt als der Punkt, an dem sie im Gleichgewicht ist.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
});
