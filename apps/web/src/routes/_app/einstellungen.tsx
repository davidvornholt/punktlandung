import { createFileRoute } from '@tanstack/react-router';

import { ConversionReference } from '#/features/halbjahre/ui/conversion-reference.tsx';
import { HalbjahreManagement } from '#/features/halbjahre/ui/halbjahre-management.tsx';
import { liveLeistungOperations } from '#/features/noten/ui/leistung-operations.ts';
import { PreparationTemplateSettings } from '#/features/noten/ui/preparation-template-settings.tsx';
import { pageTitle } from '#/shared/ui/page-title.ts';

const SettingsPage = () => (
  <>
    <h1 className="font-display text-3xl text-ink tracking-tight">
      Einstellungen
    </h1>
    <p className="mt-2 text-ink-muted">
      Halbjahre bestimmen Zeitraum und Notensystem für alle Noten.
    </p>
    <div className="mt-6">
      <HalbjahreManagement />
    </div>
    <div className="mt-10">
      <PreparationTemplateSettings operations={liveLeistungOperations} />
    </div>
    <div className="mt-10">
      <ConversionReference />
    </div>
  </>
);

export const Route = createFileRoute('/_app/einstellungen')({
  component: SettingsPage,
  head: () => ({ meta: [{ title: pageTitle('Einstellungen') }] }),
});
