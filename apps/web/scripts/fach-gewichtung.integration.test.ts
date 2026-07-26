import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect, Schema } from 'effect';

import {
  FachAktualisierung,
  FachEingabe,
} from '#/features/faecher/schemas/fach-schema.ts';
import {
  createFach,
  updateFach,
} from '#/features/faecher/services/fach-service.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import {
  gewichtungsGrenzen,
  standardgewichtung,
} from '#/shared/noten/fach-gewichtung.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const mittleresTestgewicht = 3.75;
const ungueltigeTestgewichte = [
  gewichtungsGrenzen.gewichtSchritt,
  mittleresTestgewicht,
  gewichtungsGrenzen.gewichtMax,
] as const;

const mitTestgewicht = (gewicht: number) => ({
  schoolYear: '2026/27',
  name: 'Mathematik',
  shortName: 'M',
  gewichtung: {
    ...standardgewichtung,
    arten: {
      ...standardgewichtung.arten,
      test: { gewicht, sammlung: 'gesammelt' },
    },
  },
});

const createValidatedFach = (roh: unknown) =>
  Schema.decodeUnknown(FachEingabe)(roh).pipe(Effect.flatMap(createFach));

const updateValidatedFach = (roh: unknown) =>
  Schema.decodeUnknown(FachAktualisierung)(roh).pipe(
    Effect.flatMap(updateFach),
  );

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
        ungueltigeTestgewichte.map((gewicht) =>
          provided(Effect.flip(createValidatedFach(mitTestgewicht(gewicht)))),
        ),
      );

      const vorAnlage = await pool.query<{ readonly anzahl: string }>(
        'SELECT count(*) AS anzahl FROM subject',
      );
      expect(vorAnlage.rows[0]?.anzahl).toBe('0');

      await provided(createValidatedFach(mitTestgewicht(1)));
      const fach = await pool.query<{ readonly id: string }>(
        'SELECT id FROM subject',
      );
      const fachId = fach.rows[0]?.id;
      expect(fachId).toBeString();
      if (fachId === undefined) {
        throw new Error('Angelegtes Fach fehlt.');
      }

      await Promise.all(
        ungueltigeTestgewichte.map((gewicht) =>
          provided(
            Effect.flip(
              updateValidatedFach({
                ...mitTestgewicht(gewicht),
                id: fachId,
              }),
            ),
          ),
        ),
      );

      const gewichte = await pool.query<{ readonly weighting: unknown }>(`
        SELECT weighting FROM subject
        UNION ALL
        SELECT weighting FROM school_year_subject
      `);
      expect(gewichte.rows.map(({ weighting }) => weighting)).toEqual([
        standardgewichtung,
        standardgewichtung,
      ]);
    }));
});
