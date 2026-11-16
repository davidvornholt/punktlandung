import { createFileRoute } from '@tanstack/react-router';

import { makeDatabaseCheck } from '#/shared/health/database-health.ts';
import { runServerEffect } from '#/shared/runtime.ts';

const serviceUnavailable = 503;
const headers = { 'cache-control': 'no-store' };

const isDatabaseAvailable = makeDatabaseCheck(runServerEffect);

/**
 * Health-Probe für Container-Healthcheck, Release-Umschaltung und den
 * Deploy-Check des Hosts. Sie antwortet nur dann 200, wenn die Datenbank
 * antwortet, denn ohne sie lädt keine Seite Daten. Ein Fehler trägt keine
 * Details, weil die Route öffentlich ist.
 */
export const Route = createFileRoute('/api/healthz')({
  server: {
    handlers: {
      GET: async () =>
        (await isDatabaseAvailable())
          ? Response.json({ status: 'ok' }, { headers })
          : new Response(null, { status: serviceUnavailable, headers }),
    },
  },
});
