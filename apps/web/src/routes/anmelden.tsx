import { createFileRoute, redirect } from '@tanstack/react-router';

import { authClient } from '#/shared/auth/auth-client.ts';
import { getSitzung } from '#/shared/auth/session-fn.ts';
import { primaerKnopfKlasse } from '#/shared/ui/form-klassen.ts';

const Anmelden = () => (
  <main className="flex min-h-svh items-center justify-center bg-background px-6">
    <div className="w-full max-w-sm border border-border bg-surface p-8 shadow-card">
      <h1 className="font-display text-4xl text-ink tracking-tight">
        Punktlandung
      </h1>
      <p className="mt-3 text-ink-muted">
        Dein Notenheft fürs Gymnasium: Noten erfassen, Schnitte verfolgen, das
        Zeugnis im Blick behalten.
      </p>
      <button
        className={`${primaerKnopfKlasse} mt-8 w-full py-3`}
        onClick={() => {
          authClient.signIn
            .social({ provider: 'github', callbackURL: '/' })
            .catch(() => undefined);
        }}
        type="button"
      >
        Mit GitHub anmelden
      </button>
      <p className="mt-4 text-ink-faint text-sm">
        Privater Zugang: nur das freigeschaltete GitHub-Konto kann sich
        anmelden.
      </p>
    </div>
  </main>
);

export const Route = createFileRoute('/anmelden')({
  beforeLoad: async () => {
    const sitzung = await getSitzung();
    if (sitzung !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: Anmelden,
});
