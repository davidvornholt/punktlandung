import { Effect } from 'effect';
import pg from 'pg';

import { env } from '#/shared/env.ts';
import { pgPoolSize } from './database-layer.ts';
import { preservePostgresDates } from './postgres-date.ts';

preservePostgresDates();

/** Pool für Better Auth; die Effect-Schicht hält eigene Verbindungen. */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: pgPoolSize,
});

/*
 * Beendet PostgreSQL eine ruhende Verbindung, etwa bei einem Neustart, meldet
 * der Pool das als `error`. Ohne Handler wird er zur ungefangenen
 * Ausnahme und beendet den Prozess. pg entfernt die Verbindung selbst, und die
 * nächste Abfrage baut eine neue auf; es bleibt nur, den Fehler zu melden.
 */
pool.on('error', (error) => {
  // Nur die Meldung: das Fehlerobjekt hält den Client samt Verbindungsdaten.
  Effect.runSync(
    Effect.logError(
      `Verbindungsfehler im pg-Pool für Better Auth: ${error.message}`,
    ),
  );
});
