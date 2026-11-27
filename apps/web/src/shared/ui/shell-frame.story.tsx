import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useLocation,
} from '@tanstack/react-router';
import { createContext, use, useState } from 'react';

import { PageHeader } from './page-header.tsx';
import { ShellFrame, type ShellSignOut } from './shell-frame.tsx';
import { SignInView } from './shell-sign-in.tsx';
import {
  NotFoundNotice,
  StandaloneLoadError,
  StandaloneNotFound,
  StandalonePending,
} from './shell-states.tsx';

const pages = [
  { path: '/', title: 'Übersicht' },
  { path: '/noten', title: 'Noten' },
  { path: '/noten/$id', title: 'Klausur · Analysis' },
  { path: '/zeugnis', title: 'Zeugnis' },
  { path: '/faecher', title: 'Fächer' },
  { path: '/einstellungen', title: 'Einstellungen' },
] as const;

/** Enough lines to scroll, so the bars can be seen staying where they are. */
const lines = Array.from({ length: 30 }, (_, index) => `Zeile ${index + 1}`);

const SignOutContext = createContext<ShellSignOut>({
  failed: false,
  pending: false,
  run: () => undefined,
});

const Frame = () => (
  <ShellFrame signOut={use(SignOutContext)}>
    <Outlet />
  </ShellFrame>
);

const Page = ({ title }: { readonly title: string }) => {
  const href = useLocation({ select: (location) => location.href });
  return (
    <>
      <PageHeader lead={`Adresse: ${href}`} title={title} />
      {lines.map((line) => (
        <p className="border-line-soft border-t py-3" key={line}>
          {line}
        </p>
      ))}
    </>
  );
};

type Behaviour = {
  /** The address the shell is opened at. */
  readonly at?: string;
  /** Signing out fails, as it does without a connection. */
  readonly signOutFails?: boolean;
};

type Stage = 'failed' | 'idle' | 'pending' | 'signedOut';

/** The shell around stand-in pages, with a made-up sign-out. */
export const Shell = ({ at = '/', signOutFails = false }: Behaviour) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [router] = useState(() => {
    const rootRoute = createRootRoute({
      component: Frame,
      notFoundComponent: NotFoundNotice,
    });
    return createRouter({
      // As in the app: a change of page is animated, so the disc can be seen rolling to the next page.
      defaultViewTransition: true,
      history: createMemoryHistory({ initialEntries: [at] }),
      routeTree: rootRoute.addChildren(
        pages.map((page) =>
          createRoute({
            component: () => <Page title={page.title} />,
            getParentRoute: () => rootRoute,
            path: page.path,
          }),
        ),
      ),
    });
  });
  if (stage === 'signedOut') {
    return <p className="p-4">Abgemeldet</p>;
  }
  return (
    <SignOutContext
      value={{
        failed: stage === 'failed',
        pending: stage === 'pending',
        run: () => {
          setStage('pending');
          setTimeout(() => setStage(signOutFails ? 'failed' : 'signedOut'), 0);
        },
      }}
    >
      <RouterProvider router={router} />
    </SignOutContext>
  );
};

type SignInBehaviour = {
  /** Starting the sign-in fails, as it does without a connection. */
  readonly fails?: boolean;
};

/** The sign-in page. Its button never leaves the page here: it only shows how starting goes. */
export const SignIn = ({ fails = false }: SignInBehaviour) => {
  const [stage, setStage] = useState<'failed' | 'idle' | 'pending'>('idle');
  return (
    <SignInView
      failed={stage === 'failed'}
      onSignIn={() => setStage(fails ? 'failed' : 'pending')}
      pending={stage === 'pending'}
    />
  );
};

const standaloneAddress = {
  loadError: '/',
  notFound: '/gibt-es-nicht',
  pending: '/laedt',
} as const;

type StandaloneBehaviour = {
  /** `loadError` fails to load its page once, so trying again succeeds. */
  readonly view: keyof typeof standaloneAddress;
};

/** The pages that stand without the shell: still loading, an unknown address, a page that could not be loaded. */
export const Standalone = ({ view }: StandaloneBehaviour) => {
  const [router] = useState(() => {
    let loads = 0;
    const rootRoute = createRootRoute({
      notFoundComponent: StandaloneNotFound,
    });
    return createRouter({
      history: createMemoryHistory({
        initialEntries: [standaloneAddress[view]],
      }),
      routeTree: rootRoute.addChildren([
        createRoute({
          component: () => <p className="p-4">Geladen</p>,
          errorComponent: StandaloneLoadError,
          getParentRoute: () => rootRoute,
          loader: () => {
            loads += 1;
            return loads === 1
              ? Promise.reject(new Error('Keine Verbindung'))
              : Promise.resolve();
          },
          path: standaloneAddress.loadError,
        }),
        createRoute({
          component: StandalonePending,
          getParentRoute: () => rootRoute,
          path: standaloneAddress.pending,
        }),
      ]),
    });
  });
  return <RouterProvider router={router} />;
};
