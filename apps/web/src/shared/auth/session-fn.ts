import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { auth } from '#/shared/auth/auth.ts';

export type SitzungsInfo = {
  readonly name: string;
};

/**
 * Liest die Better-Auth-Sitzung aus den Request-Headern. Schlägt die
 * Sitzungsabfrage fehl (z. B. Datenbank nicht erreichbar), gilt der Besucher
 * als nicht angemeldet — öffentliche Routen bleiben so immer erreichbar.
 */
export const getSitzung = createServerFn({ method: 'GET' }).handler(
  (): Promise<SitzungsInfo | null> =>
    auth.api
      .getSession({ headers: getRequest().headers })
      .then((sitzung) => (sitzung ? { name: sitzung.user.name } : null))
      .catch(() => null),
);
