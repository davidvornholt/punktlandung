import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { Pool, PoolClient } from 'pg';
import { defaultHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import type { HalbjahrWithNotenCount } from '#/features/halbjahre/services/halbjahr-service.ts';
import { listHalbjahre } from '#/features/halbjahre/services/halbjahr-service.ts';
import { listNoten } from '#/features/noten/services/noten-service.ts';
import { loadZeugnis } from '#/features/zeugnis/services/zeugnis-service.ts';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import type { PgDrizzle } from '#/shared/db/pg-drizzle.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from '../postgres-test-database.ts';
import { seedPreview } from '../preview-seed/seed.ts';
import { runPunktlandung } from './cli-test-support.ts';

const agentRole = 'punktlandung_agent';
const halbjahrLabel = /^(?:\d+|J[12])\.[12]$/u;
const schoolYear = /^\d{4}\/\d{2}$/u;
const notensystem = /^(?:sechser|punkte)$/u;
const calendarDate = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * Die URL der Testdatenbank, über die jede Verbindung als Rolle des Befehls
 * und schreibgeschützt läuft, wie auf prod-1.
 */
const agentUrl = (pool: Pool): string => {
  const url = new URL(pool.options.connectionString ?? '');
  url.searchParams.set(
    'options',
    `-c role=${agentRole} -c default_transaction_read_only=on`,
  );
  return url.href;
};

/** Migriert, füllt die Beispieldaten und liest, was die App zeigen würde. */
const withSeededDatabase = <Value>(
  use: (
    pool: Pool,
    app: {
      readonly halbjahre: ReadonlyArray<HalbjahrWithNotenCount>;
      readonly defaultId: string;
    },
  ) => Promise<Value>,
): Promise<Value> =>
  withPostgresTestDatabase(async (pool) => {
    await Effect.runPromise(migrateDatabase(pool));
    const layer = postgresTestLayer(pool);
    const today = berlinCalendarDate();
    await Effect.runPromise(seedPreview(today).pipe(Effect.provide(layer)));
    const halbjahre = await Effect.runPromise(
      listHalbjahre.pipe(Effect.provide(layer)),
    );
    const fallback = defaultHalbjahr(halbjahre, today);
    if (fallback === null) {
      throw new Error('Die Beispieldaten haben kein Halbjahr angelegt.');
    }
    return use(pool, { halbjahre, defaultId: fallback.id });
  });

const readAsApp = <Value, Error>(
  pool: Pool,
  effect: Effect.Effect<Value, Error, PgDrizzle>,
) => Effect.runPromise(effect.pipe(Effect.provide(postgresTestLayer(pool))));

const json = (output: string): unknown => JSON.parse(output);

describe('punktlandung against a database', () => {
  it('lists the Halbjahre and the one read by default', () =>
    withSeededDatabase(async (pool, app) => {
      const result = await runPunktlandung(['halbjahre', 'list', '--json'], {
        databaseUrl: agentUrl(pool),
      });
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      const output = json(result.stdout) as {
        readonly defaultHalbjahrId: string;
        readonly halbjahre: ReadonlyArray<Record<string, unknown>>;
      };
      expect(output.defaultHalbjahrId).toBe(app.defaultId);
      expect(output.halbjahre.map((halbjahr) => halbjahr.id)).toEqual(
        app.halbjahre.map((halbjahr) => halbjahr.id),
      );
      expect(output.halbjahre[0]).toEqual({
        id: expect.any(String),
        label: expect.stringMatching(halbjahrLabel),
        klassenstufe: expect.any(String),
        schoolYear: expect.stringMatching(schoolYear),
        half: expect.any(Number),
        system: expect.stringMatching(notensystem),
        startsOn: expect.stringMatching(calendarDate),
        endsOn: expect.stringMatching(calendarDate),
        notenCount: expect.any(Number),
      });
    }));

  it('reads the Noten and the Zeugnis the app shows', () =>
    withSeededDatabase(async (pool, app) => {
      const databaseUrl = agentUrl(pool);
      const noten = await runPunktlandung(['noten', 'list'], { databaseUrl });
      expect(noten.stderr).toBe('');
      const notenOutput = json(noten.stdout) as {
        readonly halbjahr: { readonly id: string };
        readonly faecher: ReadonlyArray<Record<string, unknown>>;
        readonly noten: ReadonlyArray<Record<string, unknown>>;
      };
      const expectedNoten = await readAsApp(pool, listNoten(app.defaultId));
      expect(notenOutput.halbjahr.id).toBe(app.defaultId);
      expect(notenOutput.noten).toEqual(
        expectedNoten.map(({ gewichtung: _gewichtung, ...leistung }) => ({
          ...leistung,
        })),
      );
      expect(notenOutput.faecher.length).toBeGreaterThan(0);
      expect(notenOutput.faecher[0]).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        shortName: expect.any(String),
        archived: expect.any(Boolean),
        gewichtung: expect.objectContaining({ arten: expect.any(Object) }),
      });

      const zeugnis = await runPunktlandung(['zeugnis'], { databaseUrl });
      expect(zeugnis.stderr).toBe('');
      expect(json(zeugnis.stdout)).toEqual(
        await readAsApp(pool, loadZeugnis(app.defaultId)),
      );
    }));

  it('chooses a Halbjahr by label or id, as the door passes them', () =>
    withSeededDatabase(async (pool, app) => {
      const [chosen] = app.halbjahre.filter(
        (halbjahr) => halbjahr.id !== app.defaultId,
      );
      if (chosen === undefined) {
        throw new Error('Die Beispieldaten haben nur ein Halbjahr.');
      }
      const databaseUrl = agentUrl(pool);
      const label = formatHalbjahrLabel(chosen).toLowerCase();
      const results = await Promise.all(
        [label, chosen.id].map((halbjahr) =>
          runPunktlandung([], {
            databaseUrl,
            sshOriginalCommand: `'zeugnis' '--halbjahr' '${halbjahr}'`,
          }),
        ),
      );
      for (const result of results) {
        expect(result.stderr).toBe('');
        expect((json(result.stdout) as { termId: string }).termId).toBe(
          chosen.id,
        );
      }

      const unknown = await runPunktlandung(
        ['noten', 'list', '--halbjahr', '4.1'],
        { databaseUrl },
      );
      expect(unknown.exitCode).toBe(2);
      expect(unknown.stdout).toBe('');
      expect(json(unknown.stderr)).toEqual({
        error: { tag: 'InvalidInput', message: expect.stringContaining('4.1') },
      });
    }));

  // Liefe der Befehl nicht als seine Rolle, läse er trotz des Entzugs weiter.
  it('reads as its role and reports a refused query as one JSON error', () =>
    withSeededDatabase(async (pool) => {
      await pool.query(`REVOKE SELECT ON term FROM ${agentRole}`);
      const result = await runPunktlandung(['halbjahre', 'list'], {
        databaseUrl: agentUrl(pool),
      });
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
      expect(json(result.stderr)).toEqual({
        error: {
          tag: 'DatabaseUnavailable',
          message: "Punktlandung's database could not be read.",
        },
      });
    }));
});

/** Führt `statement` als Rolle des Befehls aus und rollt danach zurück. */
const asAgent = async (
  pool: Pool,
  statement: string,
): Promise<'allowed' | 'denied'> => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${agentRole}`);
    await client.query(statement);
    return 'allowed';
  } catch (error) {
    if ((error as { readonly code?: unknown }).code === '42501') {
      return 'denied';
    }
    throw error;
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
};

describe('the punktlandung_agent role', () => {
  it('may read only Halbjahre, Fächer and Noten', () =>
    withPostgresTestDatabase(async (pool) => {
      await Effect.runPromise(migrateDatabase(pool));
      const grants = await pool.query<{
        readonly table: string;
        readonly privilege: string;
      }>(
        `SELECT c.relname AS table, a.privilege_type AS privilege
         FROM pg_class c, aclexplode(c.relacl) a
         WHERE a.grantee = $1::regrole
         ORDER BY c.relname, a.privilege_type`,
        [agentRole],
      );
      expect(grants.rows).toEqual(
        [
          'grade',
          'school_year_subject',
          'school_year_subject_set',
          'subject',
          'term',
        ].map((table) => ({ table, privilege: 'SELECT' })),
      );

      expect(await asAgent(pool, 'SELECT count(*) FROM grade')).toBe('allowed');
      const refused = [
        'SELECT count(*) FROM study_day',
        'SELECT count(*) FROM preparation_template',
        'SELECT count(*) FROM "session"',
        "UPDATE grade SET note = 'x'",
        'DELETE FROM term',
      ];
      expect(
        await Promise.all(refused.map((statement) => asAgent(pool, statement))),
      ).toEqual(refused.map(() => 'denied'));
    }));
});
