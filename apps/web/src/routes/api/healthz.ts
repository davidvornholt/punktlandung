import { createFileRoute } from '@tanstack/react-router';

/** Liveness-Probe für Container-Healthchecks; berührt bewusst keine Datenbank. */
export const Route = createFileRoute('/api/healthz')({
  server: {
    handlers: {
      GET: () => Response.json({ status: 'ok' }),
    },
  },
});
