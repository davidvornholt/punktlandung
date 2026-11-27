import { createFileRoute } from '@tanstack/react-router';

import { ConversionReference } from '#/features/halbjahre/ui/conversion-reference.tsx';
import { HalbjahreManagement } from '#/features/halbjahre/ui/halbjahre-management.tsx';
import { PageHeader } from '#/shared/ui/page-header.tsx';
import { pageTitle } from '#/shared/ui/page-title.ts';

const SettingsPage = () => (
  <>
    <PageHeader
      lead="Die Halbjahre, in die deine Noten gehören, und die Umrechnung zwischen Noten und Notenpunkten."
      title="Einstellungen"
    />
    <HalbjahreManagement />
    <div className="desk:mt-15 mt-11">
      <ConversionReference />
    </div>
  </>
);

export const Route = createFileRoute('/_app/einstellungen')({
  component: SettingsPage,
  head: () => ({ meta: [{ title: pageTitle('Einstellungen') }] }),
});
