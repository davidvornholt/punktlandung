import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { lehneAuthFehlerAb } from '#/shared/auth/auth-antwort.ts';
import { authClient } from '#/shared/auth/auth-client.ts';
import { getSitzung } from '#/shared/auth/session-fn.ts';
import { primaerKnopfKlasse } from '#/shared/ui/form-klassen.ts';
import { seitentitel } from '#/shared/ui/seitentitel.ts';

const Anmelden = () => {
  const anmelden = useMutation({
    mutationFn: () =>
      authClient.signIn
        .social({ provider: 'github', callbackURL: '/' })
        .then(lehneAuthFehlerAb),
  });
  return (
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
          disabled={anmelden.isPending}
          onClick={() => anmelden.mutate()}
          type="button"
        >
          {anmelden.isPending
            ? 'GitHub-Anmeldung wird geöffnet …'
            : 'Mit GitHub anmelden'}
        </button>
        {anmelden.isError ? (
          <p
            className="mt-4 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
            role="alert"
          >
            Die GitHub-Anmeldung konnte nicht gestartet werden. Prüfe die
            Verbindung und versuche es erneut.
          </p>
        ) : null}
        <p className="mt-4 text-ink-faint text-sm">
          Privater Zugang: nur das freigeschaltete GitHub-Konto kann sich
          anmelden.
        </p>
      </div>
    </main>
  );
};

export const Route = createFileRoute('/anmelden')({
  beforeLoad: async () => {
    const sitzung = await getSitzung();
    if (sitzung !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: Anmelden,
  head: () => ({ meta: [{ title: seitentitel('Anmelden') }] }),
});
