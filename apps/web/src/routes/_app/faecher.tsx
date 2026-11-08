import { createFileRoute } from '@tanstack/react-router';
import { liveFachOperations } from '#/features/faecher/ui/fach-operations.ts';
import {
  FaecherPage,
  type FaecherPageOperations,
} from '#/features/faecher/ui/faecher-page.tsx';
import { liveHalbjahrOperations } from '#/features/halbjahre/ui/halbjahr-operations.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';

const operations: FaecherPageOperations = {
  ...liveFachOperations,
  listHalbjahre: liveHalbjahrOperations.list,
};

export const Route = createFileRoute('/_app/faecher')({
  component: () => <FaecherPage operations={operations} />,
  head: () => ({ meta: [{ title: pageTitle('Fächer') }] }),
});
