import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { asc, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, subject, term } from '#/shared/db/schema.ts';
import { zuFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { zuPunkten } from '#/shared/noten/notenwert.ts';
import { berechneVerlauf } from './verlauf-berechnung.ts';

/**
 * Alle Noten über alle Halbjahre, mit zuPunkten normalisiert und mit
 * laufendem gewichtetem Gesamtschnitt — die Datenreihe der Verlaufslinie.
 */
export const ladeVerlauf = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  const zeilen = yield* db
    .select()
    .from(grade)
    .innerJoin(term, eq(grade.termId, term.id))
    .innerJoin(subject, eq(grade.subjectId, subject.id))
    .orderBy(asc(grade.takenOn), asc(grade.createdAt));
  return berechneVerlauf(
    zeilen.map(({ grade: note, term: halbjahr, subject: fach }) => ({
      datum: note.takenOn,
      punkte: zuPunkten(Number(note.value), halbjahr.system),
      gewicht:
        Number(note.weight) * zuFachgewichtung(fach).kindWeights[note.kind],
      fachKuerzel: fach.shortName,
    })),
  );
});
