import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { faecherQueryOptions } from '#/features/faecher/server/fach-fns.ts';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { aktuellesHalbjahr } from '#/features/halbjahre/services/aktuelles-halbjahr.ts';
import { HalbjahrAuswahl } from '#/features/halbjahre/ui/halbjahr-auswahl.tsx';
import { Eintragsleiste } from '#/features/noten/ui/eintragsleiste.tsx';
import { Notenliste } from '#/features/noten/ui/notenliste.tsx';

const heutigesDatum = () =>
  new Date().toISOString().slice(0, '0000-00-00'.length);

const NotenSeite = () => {
  const { data: halbjahre } = useQuery(halbjahreQueryOptions);
  const { data: faecher } = useQuery(faecherQueryOptions);
  const [gewaehltesId, setGewaehltesId] = useState<string | null>(null);

  if (halbjahre === undefined || faecher === undefined) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">Noten</h1>
        <p className="mt-6 text-ink-muted">Daten werden geladen …</p>
      </>
    );
  }

  const vorgabe = aktuellesHalbjahr(halbjahre, heutigesDatum());
  const halbjahr =
    halbjahre.find((eintrag) => eintrag.id === gewaehltesId) ?? vorgabe;

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
          {faecher.length === 0 ? (
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
                  faecher={faecher}
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
});
