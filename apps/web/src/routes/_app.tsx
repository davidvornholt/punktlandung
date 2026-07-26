import { useMutation } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { authClient } from '#/shared/auth/auth-client.ts';
import { rejectAuthError } from '#/shared/auth/auth-response.ts';
import { getSessionFn } from '#/shared/auth/session-fn.ts';

const navItems = [
  { to: '/', label: 'Übersicht' },
  { to: '/noten', label: 'Noten' },
  { to: '/zeugnis', label: 'Zeugnis' },
  { to: '/faecher', label: 'Fächer' },
  { to: '/einstellungen', label: 'Einstellungen' },
] as const;

const navLinkClass =
  'border-b-2 border-transparent px-1 pb-1 text-ink-muted text-sm transition-colors duration-150 ease-standard hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const AppShell = () => {
  const router = useRouter();
  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut().then(rejectAuthError),
    onSuccess: () => router.navigate({ to: '/anmelden' }),
  });

  return (
    <div className="min-h-svh bg-background">
      <header className="border-border border-b bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4 sm:px-6">
          <p className="font-display text-2xl text-ink tracking-tight">
            <Link
              className="focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              to="/"
            >
              Punktlandung
            </Link>
          </p>
          <button
            className="text-ink-muted text-sm underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-standard hover:text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            disabled={signOutMutation.isPending}
            onClick={() => signOutMutation.mutate()}
            type="button"
          >
            {signOutMutation.isPending ? 'Wird abgemeldet …' : 'Abmelden'}
          </button>
          {signOutMutation.isError ? (
            <p
              className="basis-full border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
              role="alert"
            >
              Die Abmeldung ist fehlgeschlagen. Du bleibst angemeldet; prüfe die
              Verbindung und versuche es erneut.
            </p>
          ) : null}
        </div>
        <nav
          aria-label="Hauptnavigation"
          className="mx-auto max-w-4xl overflow-x-auto px-4 sm:px-6"
        >
          <ul className="flex gap-5 pt-3 pb-2">
            {navItems.map((point) => (
              <li className="shrink-0" key={point.to}>
                <Link
                  activeOptions={{ exact: point.to === '/' }}
                  activeProps={{
                    className: `${navLinkClass} border-primary font-medium text-ink`,
                  }}
                  className={navLinkClass}
                  to={point.to}
                >
                  {point.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (session === null) {
      throw redirect({ to: '/anmelden' });
    }
    return { session };
  },
  component: AppShell,
});
