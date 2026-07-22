import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, subject, term } from '#/shared/db/schema.ts';
import { zuFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type {
  Fachgewichtung,
  Leistungsart,
  Notensystem,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import {
  HalbjahrNichtGefunden,
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

const ladeHalbjahr = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const zeilen = yield* db.select().from(term).where(eq(term.id, termId));
    const [halbjahr] = zeilen;
    return (
      halbjahr ?? (yield* Effect.fail(new HalbjahrNichtGefunden({ termId })))
    );
  });

/** Noten eines Halbjahrs samt Fach und dessen verkündeter Gewichtung. */
export const listNoten = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const zeilen = yield* db
      .select()
      .from(grade)
      .innerJoin(subject, eq(grade.subjectId, subject.id))
      .where(eq(grade.termId, termId))
      .orderBy(desc(grade.takenOn), desc(grade.createdAt));
    return zeilen.map(
      ({ grade: note, subject: fach }): NoteMitFach => ({
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
      }),
    );
  });

export const createNote = (eingabe: NoteEingabe) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahr = yield* ladeHalbjahr(eingabe.termId);
    yield* pruefeWert(eingabe.wert, halbjahr.system);
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
  });

export const updateNote = (eingabe: NoteAktualisierung) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const vorhanden = yield* db
      .select({ termId: grade.termId })
      .from(grade)
      .where(eq(grade.id, eingabe.id));
    const [zeile] = vorhanden;
    if (zeile === undefined) {
      return yield* Effect.fail(new NoteNichtGefunden({ noteId: eingabe.id }));
    }
    const halbjahr = yield* ladeHalbjahr(zeile.termId);
    yield* pruefeWert(eingabe.wert, halbjahr.system);
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
  });

export const deleteNote = (id: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db.delete(grade).where(eq(grade.id, id));
  });
