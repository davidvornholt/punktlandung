import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql/SqlClient';
import pg from 'pg';
import {
  databaseLayer,
  effectPoolSize,
  pgPoolSize,
} from '../src/shared/db/database-layer.ts';
import { withPostgresTestDatabase } from './postgres-test-database.ts';

/**
 * `CONNECTION LIMIT` der App-Rolle in den Preview-Datenbanken
 * (personal-infra, `infra/modules/apps/punktlandung-previews.nix`).
 */
const previewRoleConnectionLimit = 4;

const sleep = 'SELECT pg_sleep(0.2)';

describe('Verbindungsbudget', () => {
  it('bleibt unter Volllast beider Pools beim Limit der Preview-Rolle', async () => {
    await withPostgresTestDatabase(async (admin) => {
      const role = `punktlandung_limit_${crypto.randomUUID().replaceAll('-', '')}`;
      const password = crypto.randomUUID();
      await admin.query(
        `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' CONNECTION LIMIT ${previewRoleConnectionLimit}`,
      );
      const url = new URL(admin.options.connectionString ?? '');
      url.username = role;
      url.password = password;
      const authPool = new pg.Pool({
        connectionString: url.href,
        max: pgPoolSize,
      });
      try {
        // Je eine Abfrage mehr, als der Pool Verbindungen hat, damit beide
        // Pools ihr Budget ausschöpfen und der Rest wartet.
        const authLoad = Promise.all(
          Array.from({ length: pgPoolSize + 1 }, () => authPool.query(sleep)),
        );
        const effectLoad = Effect.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient;
            return yield* Effect.all(
              Array.from({ length: effectPoolSize + 1 }, () =>
                sql.unsafe(sleep),
              ),
              { concurrency: 'unbounded' },
            );
          }).pipe(Effect.provide(databaseLayer(url.href))),
        );
        const [auth, effect] = await Promise.all([authLoad, effectLoad]);
        expect(auth).toHaveLength(pgPoolSize + 1);
        expect(effect).toHaveLength(effectPoolSize + 1);
      } finally {
        await authPool.end();
        await admin.query(`DROP ROLE "${role}"`);
      }
    });
  });
});
