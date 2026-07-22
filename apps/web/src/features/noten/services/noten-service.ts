import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { istIsoDatumImZeitraum } from '#/shared/datum/zeitraum.ts';
import { grade, term } from '#/shared/db/schema.ts';
import { zuFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type {
  Fachgewichtung,
  Leistungsart,
  Notensystem,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import { ladeSchuljahrFachstand } from '#/shared/noten/schuljahr-fachstand.ts';
import {
  FachNichtImSchuljahr,
  HalbjahrNichtGefunden,
  NoteAusserhalbHalbjahr,
  NoteNichtGefunden,
  UngueltigerNotenwert,
} from '../errors/noten-errors.ts';
import type {
  NoteAktualisierung,
  NoteEingabe,
} from '../schemas/note-schema.ts';
import { istWertGueltig, standardBereich } from './notenpruefung.ts';

export type NoteMitFach = {
  readonly id: string;
  readonly kind: Leistungsart;
  readonly area: Wertungsbereich;
  readonly wert: number;
  readonly gewicht: number;
  readonly datum: string;
  readonly notiz: string | null;
  readonly fachId: string;
  readonly fachName: string;
  readonly fachKuerzel: string;
  readonly gewichtung: Fachgewichtung;
};

const pruefeWert = (wert: number, system: Notensystem) =>
  istWertGueltig(wert, system)
    ? Effect.void
    : Effect.fail(new UngueltigerNotenwert({ wert, system }));

const pruefeDatum = (
  datum: string,
  halbjahr: Pick<typeof term.$inferSelect, 'startsOn' | 'endsOn'>,
) =>
  istIsoDatumImZeitraum(datum, halbjahr.startsOn, halbjahr.endsOn)
    ? Effect.void
    : Effect.fail(
        new NoteAusserhalbHalbjahr({
          datum,
          startsOn: halbjahr.startsOn,
          endsOn: halbjahr.endsOn,
        }),
      );

const ladeHalbjahrGesperrt = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const zeilen = yield* db
      .select()
      .from(term)
      .where(eq(term.id, termId))
      .for('share');
    const [halbjahr] = zeilen;
    return (
      halbjahr ?? (yield* Effect.fail(new HalbjahrNichtGefunden({ termId })))
    );
  });

const pruefeFach = (subjectId: string, schoolYear: string) =>
  Effect.gen(function* () {
    const faecher = yield* ladeSchuljahrFachstand(schoolYear);
    if (!faecher.some((fach) => fach.id === subjectId && !fach.archived)) {
      return yield* Effect.fail(
        new FachNichtImSchuljahr({ fachId: subjectId, schoolYear }),
      );
    }
  });

/** Noten eines Halbjahrs samt historischem Fachstand und Gewichtung. */
export const listNoten = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db.select().from(term).where(eq(term.id, termId));
    const [halbjahr] = halbjahre;
    if (halbjahr === undefined) {
      return yield* Effect.fail(new HalbjahrNichtGefunden({ termId }));
    }
    const fachstand = yield* ladeSchuljahrFachstand(halbjahr.schoolYear);
    const faecher = new Map(fachstand.map((fach) => [fach.id, fach]));
    const zeilen = yield* db
      .select()
      .from(grade)
      .where(eq(grade.termId, termId))
      .orderBy(desc(grade.takenOn), desc(grade.createdAt));
    return zeilen.flatMap((note): ReadonlyArray<NoteMitFach> => {
      const fach = faecher.get(note.subjectId);
      if (fach === undefined) {
        return [];
      }
      return [
        {
          id: note.id,
          kind: note.kind,
          area: note.area,
          wert: Number(note.value),
          gewicht: Number(note.weight),
          datum: note.takenOn,
          notiz: note.note,
          fachId: fach.id,
          fachName: fach.name,
          fachKuerzel: fach.shortName,
          gewichtung: zuFachgewichtung(fach),
        },
      ];
    });
  });

export const createNote = (eingabe: NoteEingabe) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        const halbjahr = yield* ladeHalbjahrGesperrt(eingabe.termId);
        yield* pruefeWert(eingabe.wert, halbjahr.system);
        yield* pruefeDatum(eingabe.datum, halbjahr);
        yield* pruefeFach(eingabe.subjectId, halbjahr.schoolYear);
        yield* db.insert(grade).values({
          id: crypto.randomUUID(),
          subjectId: eingabe.subjectId,
          termId: eingabe.termId,
          kind: eingabe.kind,
          area: eingabe.area ?? standardBereich(eingabe.kind),
          value: `${eingabe.wert}`,
          weight: `${eingabe.gewicht}`,
          takenOn: eingabe.datum,
          note: eingabe.notiz,
        });
      }),
    );
  });

export const updateNote = (eingabe: NoteAktualisierung) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        const vorhanden = yield* db
          .select({ termId: grade.termId })
          .from(grade)
          .where(eq(grade.id, eingabe.id))
          .for('update');
        const [zeile] = vorhanden;
        if (zeile === undefined) {
          return yield* Effect.fail(
            new NoteNichtGefunden({ noteId: eingabe.id }),
          );
        }
        const halbjahr = yield* ladeHalbjahrGesperrt(zeile.termId);
        yield* pruefeWert(eingabe.wert, halbjahr.system);
        yield* pruefeDatum(eingabe.datum, halbjahr);
        yield* pruefeFach(eingabe.subjectId, halbjahr.schoolYear);
        yield* db
          .update(grade)
          .set({
            subjectId: eingabe.subjectId,
            kind: eingabe.kind,
            area: eingabe.area ?? standardBereich(eingabe.kind),
            value: `${eingabe.wert}`,
            weight: `${eingabe.gewicht}`,
            takenOn: eingabe.datum,
            note: eingabe.notiz,
          })
          .where(eq(grade.id, eingabe.id));
      }),
    );
  });

export const deleteNote = (id: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db.delete(grade).where(eq(grade.id, id));
  });
