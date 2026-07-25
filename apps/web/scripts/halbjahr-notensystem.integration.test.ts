import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const eingabe = {
  klassenstufe: 'J1' as const,
  schoolYear: '2026/27',
  half: 1 as const,
  startsOn: '2026-08-01',
  endsOn: '2027-01-31',
};

describe('Notensystem eines Halbjahrs', () => {
  it('leitet es beim Anlegen und Ändern aus der Klassenstufe ab', () =>
    withPostgresTestDatabase(async (pool) => {
      await Effect.runPromise(migrateDatabase(pool));
      const layer = postgresTestLayer(pool);
      const provided = <Value, Error>(
        effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
      ) => Effect.runPromise(effect.pipe(Effect.provide(layer)));

      await provided(createHalbjahr(eingabe));
      const [angelegt] = await provided(listHalbjahre);
      if (angelegt === undefined) {
        throw new Error('Angelegtes Halbjahr fehlt.');
      }
      expect(angelegt.system).toBe('punkte');

      await provided(
        updateHalbjahr({ ...eingabe, id: angelegt.id, klassenstufe: '10' }),
      );
      const [geaendert] = await provided(listHalbjahre);

      expect(geaendert?.system).toBe('sechser');
    }));
});
