import { createFileRoute } from '@tanstack/react-router';

import { HalbjahreVerwaltung } from '#/features/halbjahre/ui/halbjahre-verwaltung.tsx';

const EinstellungenSeite = () => (
  <>
    <h1 className="font-display text-3xl text-ink tracking-tight">
      Einstellungen
    </h1>
    <p className="mt-2 text-ink-muted">
      Halbjahre bestimmen Zeitraum und Notensystem für alle Noten.
    </p>
    <div className="mt-6">
      <HalbjahreVerwaltung />
    </div>
  </>
);

export const Route = createFileRoute('/_app/einstellungen')({
  component: EinstellungenSeite,
});
