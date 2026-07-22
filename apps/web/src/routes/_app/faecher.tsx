import { createFileRoute } from '@tanstack/react-router';

import { FaecherVerwaltung } from '#/features/faecher/ui/faecher-verwaltung.tsx';

const FaecherSeite = () => (
  <>
    <h1 className="font-display text-3xl text-ink tracking-tight">Fächer</h1>
    <p className="mt-2 text-ink-muted">
      Fächer samt Gewichtung, wie die Lehrkraft sie zu Schuljahresbeginn
      verkündet hat.
    </p>
    <div className="mt-6">
      <FaecherVerwaltung />
    </div>
  </>
);

export const Route = createFileRoute('/_app/faecher')({
  component: FaecherSeite,
});
