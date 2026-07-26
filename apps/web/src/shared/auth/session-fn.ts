import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getAuthorizedSession, type SessionInfo } from './session.ts';

/**
 * Liest die Better-Auth-Sitzung aus den Request-Headern. Schlägt die
 * Sitzungsabfrage fehl (z. B. Datenbank nicht erreichbar), gilt der Besucher
 * als nicht angemeldet — öffentliche Routen bleiben so immer erreichbar.
 */
export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  (): Promise<SessionInfo | null> =>
    getAuthorizedSession(getRequest().headers).catch(() => null),
);
