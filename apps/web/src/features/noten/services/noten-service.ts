import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { halbjahrTable, noteTable } from '#/shared/db/schema.ts';
import { isGraded } from '#/shared/noten/graded-rows.ts';
import type { Fachgewichtung, Leistungsart } from '#/shared/noten/notenwert.ts';
import { loadSchoolYearFachSnapshot } from '#/shared/noten/school-year-fach-snapshot.ts';
import { HalbjahrNotFound, NoteNotFound } from '../errors/noten-errors.ts';
import type { NoteInput, NoteUpdate } from '../schemas/note-schema.ts';
import {
  loadLockedHalbjahr,
  validateDate,
  validateFach,
  validateValue,
} from './noten-invariants.ts';

type LeistungBase = {
  readonly id: string;
  readonly kind: Leistungsart;
  readonly gewicht: number;
  /** Termin der Leistung: angekündigt, solange sie aussteht. */
  readonly datum: string;
  readonly notiz: string | null;
  readonly fachId: string;
  readonly fachName: string;
  readonly fachKuerzel: string;
  readonly gewichtung: Fachgewichtung;
};

export type BenoteteLeistung = LeistungBase & {
  readonly status: 'graded';
  readonly wert: number;
};

export type AusstehendeLeistung = LeistungBase & {
  readonly status: 'planned';
};

/**
 * Eine Leistung samt historischem Fachstand. Der Status trennt, was in den
 * Schnitt eingeht, von dem, was noch aussteht — wer `wert` lesen will, muss
 * erst `graded` prüfen.
 */
export type Leistung = BenoteteLeistung | AusstehendeLeistung;

/** Leistungen eines Halbjahrs samt historischem Fachstand und Gewichtung. */
export const listNoten = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db
      .select()
      .from(halbjahrTable)
      .where(eq(halbjahrTable.id, termId));
    const [halbjahr] = halbjahre;
    if (halbjahr === undefined) {
      return yield* Effect.fail(new HalbjahrNotFound({ termId }));
    }
    const fachSnapshot = yield* loadSchoolYearFachSnapshot(halbjahr.schoolYear);
    const faecher = new Map(fachSnapshot.map((fach) => [fach.id, fach]));
    const rows = yield* db
      .select()
      .from(noteTable)
      .where(eq(noteTable.termId, termId))
      .orderBy(desc(noteTable.takenOn), desc(noteTable.createdAt));
    return rows.flatMap((note): ReadonlyArray<Leistung> => {
      const fach = faecher.get(note.subjectId);
      if (fach === undefined) {
        return [];
      }
      const base: LeistungBase = {
        id: note.id,
        kind: note.kind,
        gewicht: Number(note.weight),
        datum: note.takenOn,
        notiz: note.note,
        fachId: fach.id,
        fachName: fach.name,
        fachKuerzel: fach.shortName,
        gewichtung: fach.gewichtung,
      };
      return [
        isGraded(note)
          ? { ...base, status: 'graded', wert: Number(note.value) }
          : { ...base, status: 'planned' },
      ];
    });
  });

const storedValue = (wert: number | null) => (wert === null ? null : `${wert}`);

export const createNote = (input: NoteInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        const halbjahr = yield* loadLockedHalbjahr(input.termId);
        yield* validateValue(input.wert, halbjahr.system, input.kind);
        yield* validateDate(input.datum, halbjahr);
        yield* validateFach(input.subjectId, halbjahr.schoolYear, null);
        yield* db.insert(noteTable).values({
          id: crypto.randomUUID(),
          subjectId: input.subjectId,
          termId: input.termId,
          kind: input.kind,
          value: storedValue(input.wert),
          weight: `${input.gewicht}`,
          takenOn: input.datum,
          note: input.notiz,
        });
      }),
    );
  });

export const updateNote = (input: NoteUpdate) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        const existing = yield* db
          .select({ termId: noteTable.termId, subjectId: noteTable.subjectId })
          .from(noteTable)
          .where(eq(noteTable.id, input.id))
          .for('update');
        const [row] = existing;
        if (row === undefined) {
          return yield* Effect.fail(new NoteNotFound({ noteId: input.id }));
        }
        const halbjahr = yield* loadLockedHalbjahr(row.termId);
        yield* validateValue(input.wert, halbjahr.system, input.kind);
        yield* validateDate(input.datum, halbjahr);
        yield* validateFach(
          input.subjectId,
          halbjahr.schoolYear,
          row.subjectId,
        );
        yield* db
          .update(noteTable)
          .set({
            subjectId: input.subjectId,
            kind: input.kind,
            value: storedValue(input.wert),
            weight: `${input.gewicht}`,
            takenOn: input.datum,
            note: input.notiz,
          })
          .where(eq(noteTable.id, input.id));
      }),
    );
  });

export const deleteNote = (id: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db.delete(noteTable).where(eq(noteTable.id, id));
  });
