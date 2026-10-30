import { PgClient } from '@effect/sql-pg';
import { Layer, Redacted } from 'effect';

import { PgDrizzle } from './pg-drizzle.ts';

/**
 * Verbindungen des Effect-Clients. Zusammen mit den vier des `pg`-Pools
 * (`pool.ts`) bleibt ein Prozess bei den zehn Verbindungen, die früher der
 * gemeinsame Pool belegen durfte.
 */
export const effectPoolSize = 6;

/**
 * SqlClient und Drizzle-Zugriff auf `connectionString`. Der Client spricht das
 * Postgres-Protokoll selbst und öffnet Verbindungen erst bei Bedarf: Ist die
 * Datenbank beim Start nicht erreichbar, scheitern nur die Abfragen, nicht der
 * Aufbau der Schicht.
 */
export const databaseLayer = (connectionString: string) => {
  const sql = PgClient.layer({
    url: Redacted.make(connectionString),
    maxConnections: effectPoolSize,
    idleTimeout: '10 seconds',
  });
  return Layer.merge(sql, PgDrizzle.layer.pipe(Layer.provide(sql)));
};
