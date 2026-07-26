import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect, Schema } from 'effect';

import {
  FachInput,
  FachUpdate,
} from '#/features/faecher/schemas/fach-schema.ts';
import {
  createFach,
  updateFach,
} from '#/features/faecher/services/fach-service.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import {
  gewichtungLimits,
  standardgewichtung,
} from '#/shared/noten/fach-gewichtung.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const middleTestGewichtung = 3.75;
const invalidTestGewichtungen = [
  gewichtungLimits.gewichtungStep,
  middleTestGewichtung,
  gewichtungLimits.maxGewichtung,
] as const;

const withTestGewichtung = (gewichtung: number) => ({
  schoolYear: '2026/27',
  name: 'Mathematik',
  shortName: 'M',
  gewichtung: {
    ...standardgewichtung,
    arten: {
      ...standardgewichtung.arten,
      test: { gewicht: gewichtung, sammlung: 'gesammelt' },
    },
  },
});

const createValidatedFach = (raw: unknown) =>
  Schema.decodeUnknown(FachInput)(raw).pipe(Effect.flatMap(createFach));

const updateValidatedFach = (raw: unknown) =>
  Schema.decodeUnknown(FachUpdate)(raw).pipe(Effect.flatMap(updateFach));

describe('Fachgewichtung an der Persistenzgrenze', () => {
  it('schreibt ungültige gesammelte Testgewichte in keine Gewichtungsspalte', () =>
    withPostgresTestDatabase(async (pool) => {
      await Effect.runPromise(migrateDatabase(pool));
      await pool.query(`
        INSERT INTO term (id, klassenstufe, school_year, half, system, starts_on, ends_on)
        VALUES ('halbjahr', '10', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29')
      `);
      const layer = postgresTestLayer(pool);
      const provided = <Value, Error>(
        effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
      ) => Effect.runPromise(effect.pipe(Effect.provide(layer)));

      await Promise.all(
        invalidTestGewichtungen.map((gewichtung) =>
          provided(
            Effect.flip(createValidatedFach(withTestGewichtung(gewichtung))),
          ),
        ),
      );

      const beforeCreate = await pool.query<{ readonly count: string }>(
        'SELECT count(*) AS count FROM subject',
      );
      expect(beforeCreate.rows[0]?.count).toBe('0');

      await provided(createValidatedFach(withTestGewichtung(1)));
      const fachRows = await pool.query<{ readonly id: string }>(
        'SELECT id FROM subject',
      );
      const fachId = fachRows.rows[0]?.id;
      expect(fachId).toBeString();
      if (fachId === undefined) {
        throw new Error('Angelegtes Fach fehlt.');
      }

      await Promise.all(
        invalidTestGewichtungen.map((gewichtung) =>
          provided(
            Effect.flip(
              updateValidatedFach({
                ...withTestGewichtung(gewichtung),
                id: fachId,
              }),
            ),
          ),
        ),
      );

      const weightingRows = await pool.query<{ readonly weighting: unknown }>(`
        SELECT weighting FROM subject
        UNION ALL
        SELECT weighting FROM school_year_subject
      `);
      expect(weightingRows.rows.map(({ weighting }) => weighting)).toEqual([
        standardgewichtung,
        standardgewichtung,
      ]);
    }));
});
