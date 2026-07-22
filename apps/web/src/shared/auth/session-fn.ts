import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getAutorisierteSitzung, type SitzungsInfo } from './session.ts';

/**
 * Liest die Better-Auth-Sitzung aus den Request-Headern. Schlägt die
 * Sitzungsabfrage fehl (z. B. Datenbank nicht erreichbar), gilt der Besucher
 * als nicht angemeldet — öffentliche Routen bleiben so immer erreichbar.
 */
export const getSitzung = createServerFn({ method: 'GET' }).handler(
  (): Promise<SitzungsInfo | null> =>
    getAutorisierteSitzung(getRequest().headers).catch(() => null),
);
