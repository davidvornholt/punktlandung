import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

import { HeuteGelernt } from '#/features/lernen/ui/heute-gelernt.tsx';
import { verlaufQueryOptions } from '#/features/noten/server/noten-fns.ts';
import { Verlaufslinie } from '#/features/noten/ui/verlaufslinie.tsx';
import { zuSechser } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { StatKarte } from '#/shared/ui/stat-karte.tsx';

const Uebersicht = () => {
  const { data: verlauf } = useQuery(verlaufQueryOptions);
  const letzter = verlauf?.at(-1);

  return (
    <>
      <h1 className="font-display text-3xl text-ink tracking-tight">
        Übersicht
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatKarte
          detail={
            letzter === undefined
              ? undefined
              : `entspricht Note ${formatNote(zuSechser(letzter.schnitt), 'sechser')}`
          }
          label="Gesamtschnitt"
          wert={
            letzter === undefined ? '—' : formatNote(letzter.schnitt, 'punkte')
          }
        />
        <StatKarte
          label="Anzahl Noten"
          wert={verlauf === undefined ? '—' : `${verlauf.length}`}
        />
        <HeuteGelernt />
      </div>
      <section className="mt-8">
        <h2 className="font-display text-2xl text-ink tracking-tight">
          Verlaufslinie
        </h2>
        {verlauf !== undefined && verlauf.length > 0 ? (
          <div className="mt-4 border border-border bg-surface p-4 shadow-card">
            <Verlaufslinie eintraege={verlauf} />
          </div>
        ) : (
          <div className="mt-4 border border-border bg-surface-sunken p-8">
            <p className="text-ink">Noch keine Noten — noch keine Linie.</p>
            <p className="mt-2 text-ink-muted">
              Lege unter{' '}
              <Link className="underline underline-offset-4" to="/faecher">
                Fächer
              </Link>{' '}
              deine Fächer an, dann trage unter{' '}
              <Link className="underline underline-offset-4" to="/noten">
                Noten
              </Link>{' '}
              die erste Note ein. Ab der ersten Note zeichnet die Verlaufslinie
              deinen gewichteten Gesamtschnitt über alle Halbjahre.
            </p>
          </div>
        )}
      </section>
    </>
  );
};

export const Route = createFileRoute('/_app/')({
  component: Uebersicht,
});
