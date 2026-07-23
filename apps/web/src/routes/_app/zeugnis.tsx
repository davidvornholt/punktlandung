import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { aktuellesHalbjahr } from '#/features/halbjahre/services/aktuelles-halbjahr.ts';
import { HalbjahrAuswahl } from '#/features/halbjahre/ui/halbjahr-auswahl.tsx';
import { Zeugnisblatt } from '#/features/zeugnis/ui/zeugnisblatt.tsx';
import { berlinKalenderdatum } from '#/shared/datum/kalenderdatum.ts';
import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { seitentitel } from '#/shared/ui/seitentitel.ts';

const ZeugnisSeite = () => {
  const halbjahreAbfrage = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreAbfrage.data;
  const [gewaehltesId, setGewaehltesId] = useState<string | null>(null);

  if (halbjahreAbfrage.isPending) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Zeugnis
        </h1>
        <div className="mt-6">
          <Ladehinweis text="Zeugnis wird geladen …" />
        </div>
      </>
    );
  }
  if (halbjahreAbfrage.isError || halbjahre === undefined) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Zeugnis
        </h1>
        <div className="mt-6">
          <AbfrageFehler
            onWiederholen={() => halbjahreAbfrage.refetch()}
            text="Die Halbjahre für das Zeugnis konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      </>
    );
  }

  const vorgabe = aktuellesHalbjahr(halbjahre, berlinKalenderdatum());
  const halbjahr =
    halbjahre.find((eintrag) => eintrag.id === gewaehltesId) ?? vorgabe;

  return (
    <>
      <h1 className="font-display text-3xl text-ink tracking-tight">Zeugnis</h1>
      {halbjahr === null ? (
        <div className="mt-6 border border-border bg-surface-sunken p-8">
          <p className="text-ink">Noch kein Halbjahr, noch kein Zeugnis.</p>
          <p className="mt-2 text-ink-muted">
            Lege unter{' '}
            <Link className="underline underline-offset-4" to="/einstellungen">
              Einstellungen
            </Link>{' '}
            ein Halbjahr an — danach entsteht hier die Zeugnisvorschau.
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
          <Zeugnisblatt termId={halbjahr.id} />
        </>
      )}
    </>
  );
};

export const Route = createFileRoute('/_app/zeugnis')({
  component: ZeugnisSeite,
  head: () => ({ meta: [{ title: seitentitel('Zeugnis') }] }),
});
