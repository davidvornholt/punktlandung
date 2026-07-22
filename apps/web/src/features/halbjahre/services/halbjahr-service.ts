import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { term } from '#/shared/db/schema.ts';
import type {
  HalbjahrAktualisierung,
  HalbjahrEingabe,
} from '../schemas/halbjahr-schema.ts';

export type Halbjahr = typeof term.$inferSelect;

/** Halbjahre, neuestes zuerst (nach Beginn sortiert). */
export const listHalbjahre = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  return yield* db.select().from(term).orderBy(desc(term.startsOn));
});

export const createHalbjahr = (eingabe: HalbjahrEingabe) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db.insert(term).values({ id: crypto.randomUUID(), ...eingabe });
  });

export const updateHalbjahr = (eingabe: HalbjahrAktualisierung) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const { id, ...felder } = eingabe;
    yield* db.update(term).set(felder).where(eq(term.id, id));
  });
