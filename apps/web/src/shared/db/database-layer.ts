import { PgClient } from '@effect/sql-pg';
import { Layer, Redacted } from 'effect';

import { PgDrizzle } from './pg-drizzle.ts';

/*
 * Der Effect-Client und der pg-Pool für Better Auth (`pool.ts`) halten
 * getrennte Verbindungen, die einander nicht aushelfen. Zusammen bleiben sie
 * beim Limit der App-Rolle in den Preview-Datenbanken (vier Verbindungen);
 * weitere Abfragen warten in ihrem Pool, statt am Limit zu scheitern.
 */

/** Verbindungen des Effect-Clients. */
export const effectPoolSize = 2;

/** Verbindungen des pg-Pools für Better Auth. */
export const pgPoolSize = 2;

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
