import { createFileRoute, Link } from '@tanstack/react-router';
import { liveFachOperations } from '#/features/faecher/ui/fach-operations.ts';
import {
  FaecherPage,
  type FaecherPageOperations,
} from '#/features/faecher/ui/faecher-page.tsx';
import { liveHalbjahrOperations } from '#/features/halbjahre/ui/halbjahr-operations.ts';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';

const operations: FaecherPageOperations = {
  ...liveFachOperations,
  listHalbjahre: liveHalbjahrOperations.list,
};

export const Route = createFileRoute('/_app/faecher')({
  component: () => (
    <FaecherPage
      noHalbjahrAction={
        <Link className={primaryButtonClass} to="/einstellungen">
          Zu den Einstellungen
        </Link>
      }
      operations={operations}
    />
  ),
  head: () => ({ meta: [{ title: pageTitle('Fächer') }] }),
});
