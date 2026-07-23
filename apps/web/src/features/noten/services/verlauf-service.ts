import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { asc, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, term } from '#/shared/db/schema.ts';
import { zuFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { zuPunkten } from '#/shared/noten/notenwert.ts';
import type { SchuljahrFach } from '#/shared/noten/schuljahr-fachstand.ts';
import { ladeSchuljahrFachstand } from '#/shared/noten/schuljahr-fachstand.ts';
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
    .orderBy(asc(grade.takenOn), asc(grade.createdAt));
  const fachstaende = new Map<string, ReadonlyArray<SchuljahrFach>>();
  for (const { term: halbjahr } of zeilen) {
    if (!fachstaende.has(halbjahr.schoolYear)) {
      fachstaende.set(
        halbjahr.schoolYear,
        yield* ladeSchuljahrFachstand(halbjahr.schoolYear),
      );
    }
  }
  return berechneVerlauf(
    zeilen.flatMap(({ grade: note, term: halbjahr }) => {
      const fach = fachstaende
        .get(halbjahr.schoolYear)
        ?.find((eintrag) => eintrag.id === note.subjectId);
      return fach === undefined
        ? []
        : [
            {
              datum: note.takenOn,
              punkte: zuPunkten(Number(note.value), halbjahr.system),
              gewicht: Number(note.weight),
              fachStandId: `${halbjahr.schoolYear}:${fach.id}`,
              fachKuerzel: fach.shortName,
              kind: note.kind,
              area: note.area,
              gewichtung: zuFachgewichtung(fach),
            },
          ];
    }),
  );
});
