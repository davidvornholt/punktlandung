import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { isIsoDateInRange } from '#/shared/date/date-range.ts';
import { halbjahrTable, noteTable } from '#/shared/db/schema.ts';
import { toFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type {
  Fachgewichtung,
  Leistungsart,
  Notensystem,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import { loadSchoolYearFachSnapshot } from '#/shared/noten/school-year-fach-snapshot.ts';
import {
  FachNotInSchoolYear,
  HalbjahrNotFound,
  InvalidNotenwert,
  NoteNotFound,
  NoteOutsideHalbjahr,
} from '../errors/noten-errors.ts';
import type { NoteInput, NoteUpdate } from '../schemas/note-schema.ts';
import { defaultWertungsbereich, isValueValid } from './noten-validation.ts';

export type NoteWithFach = {
  readonly id: string;
  readonly leistungsart: Leistungsart;
  readonly wertungsbereich: Wertungsbereich;
  readonly notenwert: number;
  readonly individualGewichtung: number;
  readonly date: string;
  readonly comment: string | null;
  readonly fachId: string;
  readonly fachName: string;
  readonly fachShortName: string;
  readonly fachGewichtung: Fachgewichtung;
};

const validateValue = (value: number, notensystem: Notensystem) =>
  isValueValid(value, notensystem)
    ? Effect.void
    : Effect.fail(new InvalidNotenwert({ value, notensystem }));

const validateDate = (
  date: string,
  halbjahr: Pick<typeof halbjahrTable.$inferSelect, 'startsOn' | 'endsOn'>,
) =>
  isIsoDateInRange(date, halbjahr.startsOn, halbjahr.endsOn)
    ? Effect.void
    : Effect.fail(
        new NoteOutsideHalbjahr({
          date,
          startsOn: halbjahr.startsOn,
          endsOn: halbjahr.endsOn,
        }),
      );

const loadLockedHalbjahr = (halbjahrId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const rows = yield* db
      .select()
      .from(halbjahrTable)
      .where(eq(halbjahrTable.id, halbjahrId))
      .for('share');
    const [halbjahr] = rows;
    return (
      halbjahr ?? (yield* Effect.fail(new HalbjahrNotFound({ halbjahrId })))
    );
  });

const validateFach = (fachId: string, schoolYear: string) =>
  Effect.gen(function* () {
    const faecher = yield* loadSchoolYearFachSnapshot(schoolYear);
    if (!faecher.some((fach) => fach.id === fachId && !fach.archived)) {
      return yield* Effect.fail(
        new FachNotInSchoolYear({ fachId, schoolYear }),
      );
    }
  });

/** Noten eines Halbjahrs samt historischem Fachstand und Gewichtung. */
export const listNoten = (halbjahrId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db
      .select()
      .from(halbjahrTable)
      .where(eq(halbjahrTable.id, halbjahrId));
    const [halbjahr] = halbjahre;
    if (halbjahr === undefined) {
      return yield* Effect.fail(new HalbjahrNotFound({ halbjahrId }));
    }
    const fachSnapshot = yield* loadSchoolYearFachSnapshot(halbjahr.schoolYear);
    const faecher = new Map(fachSnapshot.map((fach) => [fach.id, fach]));
    const rows = yield* db
      .select()
      .from(noteTable)
      .where(eq(noteTable.halbjahrId, halbjahrId))
      .orderBy(desc(noteTable.takenOn), desc(noteTable.createdAt));
    return rows.flatMap((note): ReadonlyArray<NoteWithFach> => {
      const fach = faecher.get(note.fachId);
      if (fach === undefined) {
        return [];
      }
      return [
        {
          id: note.id,
          leistungsart: note.leistungsart,
          wertungsbereich: note.wertungsbereich,
          notenwert: Number(note.notenwert),
          individualGewichtung: Number(note.gewichtung),
          date: note.takenOn,
          comment: note.comment,
          fachId: fach.id,
          fachName: fach.name,
          fachShortName: fach.shortName,
          fachGewichtung: toFachgewichtung(fach),
        },
      ];
    });
  });

export const createNote = (input: NoteInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        const halbjahr = yield* loadLockedHalbjahr(input.halbjahrId);
        yield* validateValue(input.notenwert, halbjahr.notensystem);
        yield* validateDate(input.date, halbjahr);
        yield* validateFach(input.fachId, halbjahr.schoolYear);
        yield* db.insert(noteTable).values({
          id: crypto.randomUUID(),
          fachId: input.fachId,
          halbjahrId: input.halbjahrId,
          leistungsart: input.leistungsart,
          wertungsbereich:
            input.wertungsbereich ?? defaultWertungsbereich(input.leistungsart),
          notenwert: `${input.notenwert}`,
          gewichtung: `${input.individualGewichtung}`,
          takenOn: input.date,
          comment: input.comment,
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
          .select({ halbjahrId: noteTable.halbjahrId })
          .from(noteTable)
          .where(eq(noteTable.id, input.id))
          .for('update');
        const [row] = existing;
        if (row === undefined) {
          return yield* Effect.fail(new NoteNotFound({ noteId: input.id }));
        }
        const halbjahr = yield* loadLockedHalbjahr(row.halbjahrId);
        yield* validateValue(input.notenwert, halbjahr.notensystem);
        yield* validateDate(input.date, halbjahr);
        yield* validateFach(input.fachId, halbjahr.schoolYear);
        yield* db
          .update(noteTable)
          .set({
            fachId: input.fachId,
            leistungsart: input.leistungsart,
            wertungsbereich:
              input.wertungsbereich ??
              defaultWertungsbereich(input.leistungsart),
            notenwert: `${input.notenwert}`,
            gewichtung: `${input.individualGewichtung}`,
            takenOn: input.date,
            comment: input.comment,
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
