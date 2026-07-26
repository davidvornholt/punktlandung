import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { and, eq, max } from 'drizzle-orm';
import { Effect } from 'effect';

import { schoolYearSubject, subject, term } from '#/shared/db/schema.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import type { SchuljahrFach } from '#/shared/noten/schuljahr-fachstand.ts';
import {
  ladeSchuljahrFachstand,
  materialisiereBestehendeSchuljahre,
} from '#/shared/noten/schuljahr-fachstand.ts';
import {
  FachNichtGefunden,
  FachSchuljahrNichtGefunden,
} from '../errors/fach-errors.ts';
import type {
  FachAktualisierung,
  FachEingabe,
} from '../schemas/fach-schema.ts';

export type Fach = {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly gewichtung: Fachgewichtung;
  readonly sortOrder: number;
};

const zuFach = (zeile: SchuljahrFach): Fach => ({
  id: zeile.id,
  name: zeile.name,
  shortName: zeile.shortName,
  gewichtung: zeile.gewichtung,
  sortOrder: zeile.sortOrder,
});

const zuSpalten = (eingabe: FachEingabe | FachAktualisierung) => ({
  name: eingabe.name,
  shortName: eingabe.shortName,
  weighting: eingabe.gewichtung,
});

const bereiteMutationVor = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db.select().from(term).for('update');
    if (!halbjahre.some((halbjahr) => halbjahr.schoolYear === schoolYear)) {
      return yield* Effect.fail(new FachSchuljahrNichtGefunden({ schoolYear }));
    }
    yield* materialisiereBestehendeSchuljahre;
  });

export const listFaecher = (schoolYear: string) =>
  ladeSchuljahrFachstand(schoolYear).pipe(
    Effect.map((faecher) =>
      faecher.filter((fach) => !fach.archived).map(zuFach),
    ),
  );

export const createFach = (eingabe: FachEingabe) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        yield* bereiteMutationVor(eingabe.schoolYear);
        const hoechste = yield* db
          .select({ wert: max(schoolYearSubject.sortOrder) })
          .from(schoolYearSubject)
          .where(eq(schoolYearSubject.schoolYear, eingabe.schoolYear));
        const id = crypto.randomUUID();
        const sortOrder = (hoechste[0]?.wert ?? -1) + 1;
        const spalten = zuSpalten(eingabe);
        yield* db.insert(subject).values({
          id,
          sortOrder,
          ...spalten,
        });
        yield* db.insert(schoolYearSubject).values({
          schoolYear: eingabe.schoolYear,
          subjectId: id,
          sortOrder,
          ...spalten,
        });
      }),
    );
  });

export const updateFach = (eingabe: FachAktualisierung) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        yield* bereiteMutationVor(eingabe.schoolYear);
        const aktualisiert = yield* db
          .update(schoolYearSubject)
          .set(zuSpalten(eingabe))
          .where(
            and(
              eq(schoolYearSubject.schoolYear, eingabe.schoolYear),
              eq(schoolYearSubject.subjectId, eingabe.id),
            ),
          )
          .returning({ id: schoolYearSubject.subjectId });
        if (aktualisiert.length === 0) {
          return yield* Effect.fail(
            new FachNichtGefunden({
              fachId: eingabe.id,
              schoolYear: eingabe.schoolYear,
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
        yield* bereiteMutationVor(schoolYear);
        const archiviert = yield* db
          .update(schoolYearSubject)
          .set({ archived: true })
          .where(
            and(
              eq(schoolYearSubject.schoolYear, schoolYear),
              eq(schoolYearSubject.subjectId, id),
            ),
          )
          .returning({ id: schoolYearSubject.subjectId });
        if (archiviert.length === 0) {
          return yield* Effect.fail(
            new FachNichtGefunden({ fachId: id, schoolYear }),
          );
        }
      }),
    );
  });
