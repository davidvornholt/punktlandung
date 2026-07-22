import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { aktuellesHalbjahr } from '#/features/halbjahre/services/aktuelles-halbjahr.ts';
import { HalbjahrAuswahl } from '#/features/halbjahre/ui/halbjahr-auswahl.tsx';
import { Zeugnisblatt } from '#/features/zeugnis/ui/zeugnisblatt.tsx';

const heutigesDatum = () =>
  new Date().toISOString().slice(0, '0000-00-00'.length);

const ZeugnisSeite = () => {
  const { data: halbjahre } = useQuery(halbjahreQueryOptions);
  const [gewaehltesId, setGewaehltesId] = useState<string | null>(null);

  if (halbjahre === undefined) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Zeugnis
        </h1>
        <p className="mt-6 text-ink-muted">Daten werden geladen …</p>
      </>
    );
  }

  const vorgabe = aktuellesHalbjahr(halbjahre, heutigesDatum());
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
});
