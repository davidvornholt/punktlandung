import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { asc, eq, max } from 'drizzle-orm';
import { Effect } from 'effect';

import { subject } from '#/shared/db/schema.ts';
import type {
  FachAktualisierung,
  FachEingabe,
} from '../schemas/fach-schema.ts';

export type Fach = {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly writtenShare: number | null;
  readonly klausurWeight: number;
  readonly testWeight: number;
  readonly muendlichWeight: number;
  readonly gfsWeight: number;
  readonly sonstigeWeight: number;
  readonly sortOrder: number;
};

type FachZeile = typeof subject.$inferSelect;

/** Drizzle liefert numeric-Spalten als Strings; hier wird konvertiert. */
const zuFach = (zeile: FachZeile): Fach => ({
  id: zeile.id,
  name: zeile.name,
  shortName: zeile.shortName,
  writtenShare: zeile.writtenShare,
  klausurWeight: Number(zeile.klausurWeight),
  testWeight: Number(zeile.testWeight),
  muendlichWeight: Number(zeile.muendlichWeight),
  gfsWeight: Number(zeile.gfsWeight),
  sonstigeWeight: Number(zeile.sonstigeWeight),
  sortOrder: zeile.sortOrder,
});

const zuSpalten = (eingabe: FachEingabe) => ({
  name: eingabe.name,
  shortName: eingabe.shortName,
  writtenShare: eingabe.writtenShare,
  klausurWeight: `${eingabe.klausurWeight}`,
  testWeight: `${eingabe.testWeight}`,
  muendlichWeight: `${eingabe.muendlichWeight}`,
  gfsWeight: `${eingabe.gfsWeight}`,
  sonstigeWeight: `${eingabe.sonstigeWeight}`,
});

export const listFaecher = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  const zeilen = yield* db
    .select()
    .from(subject)
    .where(eq(subject.archived, false))
    .orderBy(asc(subject.sortOrder), asc(subject.name));
  return zeilen.map(zuFach);
});

export const createFach = (eingabe: FachEingabe) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const hoechste = yield* db
      .select({ wert: max(subject.sortOrder) })
      .from(subject);
    yield* db.insert(subject).values({
      id: crypto.randomUUID(),
      sortOrder: (hoechste[0]?.wert ?? -1) + 1,
      ...zuSpalten(eingabe),
    });
  });

export const updateFach = (eingabe: FachAktualisierung) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db
      .update(subject)
      .set(zuSpalten(eingabe))
      .where(eq(subject.id, eingabe.id));
  });

export const archiveFach = (id: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db.update(subject).set({ archived: true }).where(eq(subject.id, id));
  });
