import { describe, expect, it } from 'bun:test';
import {
  createNote,
  deleteNote,
  updateNote,
} from '#/features/noten/services/noten-service.ts';
import {
  note,
  raceServiceWithMigrationLocks,
  seedCurrentDatabase,
  testTimeoutMs,
} from './database-migration-service-concurrency-test-support.ts';
import { withPostgresTestDatabase } from './postgres-test-database.ts';

describe('Notenmutationen während der Migrationssperren', () => {
  it(
    'serialisiert createNote ohne Deadlock vor die Migration',
    () =>
      withPostgresTestDatabase(async (pool) => {
        await seedCurrentDatabase(pool);

        const statuses = await raceServiceWithMigrationLocks(
          pool,
          createNote(note),
          'subject',
        );

        expect(statuses).toEqual(['fulfilled', 'fulfilled']);
        const grades = await pool.query<{ readonly count: string }>(
          'SELECT count(*)::text AS count FROM grade',
        );
        expect(grades.rows[0]?.count).toBe('2');
      }),
    testTimeoutMs,
  );

  it(
    'serialisiert updateNote ohne Deadlock vor die Migration',
    () =>
      withPostgresTestDatabase(async (pool) => {
        await seedCurrentDatabase(pool, 'school_year_subject');

        const statuses = await raceServiceWithMigrationLocks(
          pool,
          updateNote({
            ...note,
            id: 'bestehend',
            wert: 3,
            notiz: 'aktualisiert',
          }),
          'school_year_subject',
        );

        expect(statuses).toEqual(['fulfilled', 'fulfilled']);
        const grades = await pool.query<{
          readonly value: string;
          readonly note: string | null;
        }>('SELECT value, note FROM grade WHERE id = $1', ['bestehend']);
        expect(grades.rows).toEqual([{ value: '3.00', note: 'aktualisiert' }]);
      }),
    testTimeoutMs,
  );

  it(
    'serialisiert deleteNote ohne Deadlock vor die Migration',
    () =>
      withPostgresTestDatabase(async (pool) => {
        await seedCurrentDatabase(pool);

        const statuses = await raceServiceWithMigrationLocks(
          pool,
          deleteNote('bestehend'),
          null,
        );

        expect(statuses).toEqual(['fulfilled', 'fulfilled']);
        const grades = await pool.query<{ readonly count: string }>(
          'SELECT count(*)::text AS count FROM grade WHERE id = $1',
          ['bestehend'],
        );
        expect(grades.rows[0]?.count).toBe('0');
      }),
    testTimeoutMs,
  );
});
