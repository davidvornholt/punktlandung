import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { and, eq, max } from 'drizzle-orm';
import { Effect } from 'effect';

import {
  fachTable,
  halbjahrTable,
  schoolYearFachTable,
} from '#/shared/db/schema.ts';
import type { SchoolYearFach } from '#/shared/noten/school-year-fach-snapshot.ts';
import {
  loadSchoolYearFachSnapshot,
  materializeExistingSchoolYears,
} from '#/shared/noten/school-year-fach-snapshot.ts';
import { FachNotFound, FachSchoolYearNotFound } from '../errors/fach-errors.ts';
import type { FachInput, FachUpdate } from '../schemas/fach-schema.ts';

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

const toFach = (row: SchoolYearFach): Fach => ({
  id: row.id,
  name: row.name,
  shortName: row.shortName,
  writtenShare: row.writtenShare,
  klausurWeight: Number(row.klausurWeight),
  testWeight: Number(row.testWeight),
  muendlichWeight: Number(row.muendlichWeight),
  gfsWeight: Number(row.gfsWeight),
  sonstigeWeight: Number(row.sonstigeWeight),
  sortOrder: row.sortOrder,
});

const toColumns = (input: FachInput | FachUpdate) => ({
  name: input.name,
  shortName: input.shortName,
  writtenShare: input.writtenShare,
  klausurWeight: `${input.klausurWeight}`,
  testWeight: `${input.testWeight}`,
  muendlichWeight: `${input.muendlichWeight}`,
  gfsWeight: `${input.gfsWeight}`,
  sonstigeWeight: `${input.sonstigeWeight}`,
});

const prepareMutation = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db.select().from(halbjahrTable).for('update');
    if (!halbjahre.some((halbjahr) => halbjahr.schoolYear === schoolYear)) {
      return yield* Effect.fail(new FachSchoolYearNotFound({ schoolYear }));
    }
    yield* materializeExistingSchoolYears;
  });

export const listFaecher = (schoolYear: string) =>
  loadSchoolYearFachSnapshot(schoolYear).pipe(
    Effect.map((faecher) =>
      faecher.filter((fach) => !fach.archived).map(toFach),
    ),
  );

export const createFach = (input: FachInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        yield* prepareMutation(input.schoolYear);
        const highest = yield* db
          .select({ value: max(schoolYearFachTable.sortOrder) })
          .from(schoolYearFachTable)
          .where(eq(schoolYearFachTable.schoolYear, input.schoolYear));
        const id = crypto.randomUUID();
        const sortOrder = (highest[0]?.value ?? -1) + 1;
        const columns = toColumns(input);
        yield* db.insert(fachTable).values({
          id,
          sortOrder,
          ...columns,
        });
        yield* db.insert(schoolYearFachTable).values({
          schoolYear: input.schoolYear,
          subjectId: id,
          sortOrder,
          ...columns,
        });
      }),
    );
  });

export const updateFach = (input: FachUpdate) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        yield* prepareMutation(input.schoolYear);
        const updated = yield* db
          .update(schoolYearFachTable)
          .set(toColumns(input))
          .where(
            and(
              eq(schoolYearFachTable.schoolYear, input.schoolYear),
              eq(schoolYearFachTable.subjectId, input.id),
            ),
          )
          .returning({ id: schoolYearFachTable.subjectId });
        if (updated.length === 0) {
          return yield* Effect.fail(
            new FachNotFound({
              fachId: input.id,
              schoolYear: input.schoolYear,
            }),
          );
        }
      }),
    );
  });

export const archiveFach = (id: string, schoolYear: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        yield* prepareMutation(schoolYear);
        const archived = yield* db
          .update(schoolYearFachTable)
          .set({ archived: true })
          .where(
            and(
              eq(schoolYearFachTable.schoolYear, schoolYear),
              eq(schoolYearFachTable.subjectId, id),
            ),
          )
          .returning({ id: schoolYearFachTable.subjectId });
        if (archived.length === 0) {
          return yield* Effect.fail(
            new FachNotFound({ fachId: id, schoolYear }),
          );
        }
      }),
    );
  });
