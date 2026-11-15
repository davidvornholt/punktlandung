import { describe, expect, it } from 'bun:test';
import process from 'node:process';
import { withPostgresTestDatabase } from './postgres-test-database.ts';

/**
 * Läuft in einem eigenen Prozess, weil ein ungefangener `error` des Pools den
 * Prozess beendet. Das Skript beendet die ruhende Verbindung des Pools von
 * der Datenbank aus, so wie ein Neustart von PostgreSQL es tut, und fragt
 * danach erneut ab.
 */
const probe = `
import pg from 'pg';
import { pool } from '#/shared/db/pool.ts';

const backendPid = async () =>
  (await pool.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

const before = await backendPid();
const killer = new pg.Client({ connectionString: process.env.DATABASE_URL });
await killer.connect();
await killer.query('SELECT pg_terminate_backend($1)', [before]);
await Bun.sleep(500);
const after = await backendPid();
await killer.end();
await pool.end();
console.log(JSON.stringify({ reconnected: after !== before }));
`;

describe('Pool für Better Auth', () => {
  it('überlebt eine von PostgreSQL beendete ruhende Verbindung', async () => {
    await withPostgresTestDatabase(async (admin) => {
      const child = Bun.spawn(['bun', '-e', probe], {
        env: {
          ...process.env,
          ...Object.fromEntries([
            ['DATABASE_URL', admin.options.connectionString ?? ''],
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
      expect(stdout).toContain(
        'Verbindungsfehler im pg-Pool für Better Auth: terminating connection',
      );
      expect(stdout.trim().split('\n').at(-1)).toBe(
        JSON.stringify({ reconnected: true }),
      );
    });
  });
});
