import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { faecherQueryOptions } from '#/features/faecher/server/fach-fns.ts';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { aktuellesHalbjahr } from '#/features/halbjahre/services/aktuelles-halbjahr.ts';
import { HalbjahrAuswahl } from '#/features/halbjahre/ui/halbjahr-auswahl.tsx';
import { Eintragsleiste } from '#/features/noten/ui/eintragsleiste.tsx';
import { Notenliste } from '#/features/noten/ui/notenliste.tsx';
import { berlinKalenderdatum } from '#/shared/datum/kalenderdatum.ts';
import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { seitentitel } from '#/shared/ui/seitentitel.ts';

const NotenSeite = () => {
  const halbjahreAbfrage = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreAbfrage.data;
  const [gewaehltesId, setGewaehltesId] = useState<string | null>(null);

  const vorgabe =
    halbjahre === undefined
      ? null
      : aktuellesHalbjahr(halbjahre, berlinKalenderdatum());
  const halbjahr =
    halbjahre?.find((eintrag) => eintrag.id === gewaehltesId) ?? vorgabe;
  const faecherAbfrage = useQuery({
    ...faecherQueryOptions(halbjahr?.schoolYear ?? ''),
    enabled: halbjahr !== null,
  });
  const faecher = faecherAbfrage.data;

  if (
    halbjahreAbfrage.isPending ||
    (halbjahr !== null && faecherAbfrage.isPending)
  ) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">Noten</h1>
        <div className="mt-6">
          <Ladehinweis text="Noten werden geladen …" />
        </div>
      </>
    );
  }
  if (
    halbjahreAbfrage.isError ||
    faecherAbfrage.isError ||
    halbjahre === undefined ||
    (halbjahr !== null && faecher === undefined)
  ) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">Noten</h1>
        <div className="mt-6">
          <AbfrageFehler
            onWiederholen={() =>
              Promise.all([
                halbjahreAbfrage.isError
                  ? halbjahreAbfrage.refetch()
                  : Promise.resolve(),
                faecherAbfrage.isError
                  ? faecherAbfrage.refetch()
                  : Promise.resolve(),
              ])
            }
            text="Halbjahre oder Fächer konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl text-ink tracking-tight">Noten</h1>
      {halbjahr === null ? (
        <div className="mt-6 border border-border bg-surface-sunken p-8">
          <p className="text-ink">Es gibt noch kein Halbjahr.</p>
          <p className="mt-2 text-ink-muted">
            Lege unter{' '}
            <Link className="underline underline-offset-4" to="/einstellungen">
              Einstellungen
            </Link>{' '}
            das laufende Halbjahr an, damit Noten ein Zuhause haben.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 max-w-xs">
            <HalbjahrAuswahl
              halbjahre={halbjahre}
              onWechsel={setGewaehltesId}
              wert={halbjahr.id}
            />
          </div>
          {(faecher ?? []).length === 0 ? (
            <div className="mt-6 border border-border bg-surface-sunken p-8">
              <p className="text-ink">Noch keine Fächer.</p>
              <p className="mt-2 text-ink-muted">
                Lege unter{' '}
                <Link className="underline underline-offset-4" to="/faecher">
                  Fächer
                </Link>{' '}
                deine Fächer samt Gewichtung an, dann kannst du hier Noten
                eintragen.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <Eintragsleiste
                  faecher={faecher ?? []}
                  key={halbjahr.id}
                  term={halbjahr}
                />
              </div>
              <Notenliste term={halbjahr} />
            </>
          )}
        </>
      )}
    </>
  );
};

export const Route = createFileRoute('/_app/noten')({
  component: NotenSeite,
  head: () => ({ meta: [{ title: seitentitel('Noten') }] }),
});
