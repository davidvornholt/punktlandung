import { describe, expect, it } from 'bun:test';
import process from 'node:process';
import { withPostgresTestDatabase } from './postgres-test-database.ts';

/**
 * Läuft in einem eigenen Prozess, weil die Runtime und die Konfiguration der
 * App beim Laden entstehen. Das Skript spielt einen Datenbankausfall durch,
 * so wie ein Neustart von PostgreSQL ihn zeigt: neue Verbindungen scheitern,
 * und die bestehenden der App enden. Danach kommt die Datenbank zurück,
 * ohne dass die App neu startet.
 */
const probe = `
import pg from 'pg';
import { Route } from '#/routes/api/healthz.ts';
import { runServerEffect, runtime } from '#/shared/runtime.ts';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql/SqlClient';

// Die App-Verbindungen tragen den Namen, damit nur sie enden.
const appName = 'healthz-probe';
const adminUrl = new URL(process.env.DATABASE_URL);
const database = adminUrl.pathname.slice(1);
// PostgreSQL erlaubt ALLOW_CONNECTIONS nicht für die eigene Datenbank.
adminUrl.pathname = '/postgres';
adminUrl.searchParams.delete('application_name');
const admin = new pg.Client({ connectionString: adminUrl.href });
await admin.connect();

const health = async () => {
  const startedAt = performance.now();
  const response = await Route.options.server.handlers.GET({});
  return {
    status: response.status,
    body: await response.text(),
    elapsedMs: Math.round(performance.now() - startedAt),
  };
};
const readable = async () =>
  (
    await runServerEffect(
      Effect.exit(Effect.flatMap(SqlClient, (sql) => sql\`SELECT 1\`)),
    )
  )._tag === 'Success';

const result = {};
try {
  result.before = await health();
  await admin.query('ALTER DATABASE "' + database + '" ALLOW_CONNECTIONS false');
  await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1', [appName]);
  result.readableDuringOutage = await readable();
  result.during = await health();
  await admin.query('ALTER DATABASE "' + database + '" ALLOW_CONNECTIONS true');
  result.after = await health();
  result.readableAfterOutage = await readable();
} finally {
  await admin.query('ALTER DATABASE "' + database + '" ALLOW_CONNECTIONS true');
  await runtime.dispose();
  await admin.end();
}
console.log('RESULT ' + JSON.stringify(result));
`;

const okStatus = 200;
const unavailableStatus = 503;
const outageDeadlineMs = 3000;

describe('Health-Route mit echter Datenbank', () => {
  it('meldet sich nicht verfügbar, solange die Datenbank nicht antwortet, und erholt sich ohne Neustart', async () => {
    await withPostgresTestDatabase(async (admin) => {
      const { rows } = await admin.query('SELECT current_database() AS name');
      const url = new URL(admin.options.connectionString ?? '');
      url.pathname = `/${rows[0].name}`;
      url.searchParams.set('application_name', 'healthz-probe');
      const child = Bun.spawn(['bun', '-e', probe], {
        env: {
          ...process.env,
          ...Object.fromEntries([
            ['DATABASE_URL', url.href],
            ['BETTER_AUTH_SECRET', 'x'.repeat(32)],
            ['GITHUB_CLIENT_ID', 'test'],
            ['GITHUB_CLIENT_SECRET', 'test'],
            ['GITHUB_ALLOWED_ACCOUNT_ID', '1'],
          ]),
        },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: '' });
      const line = stdout
        .split('\n')
        .find((entry) => entry.startsWith('RESULT '));
      const result = JSON.parse(line?.slice('RESULT '.length) ?? 'null');
      expect(result.before).toMatchObject({ status: okStatus });
      expect(JSON.parse(result.before.body)).toEqual({ status: 'ok' });
      expect(result.readableDuringOutage).toBe(false);
      expect(result.during).toMatchObject({
        status: unavailableStatus,
        body: '',
      });
      expect(result.during.elapsedMs).toBeLessThan(outageDeadlineMs);
      expect(result.after).toMatchObject({ status: okStatus });
      expect(result.readableAfterOutage).toBe(true);
    });
  }, 60_000);
});
