import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, subject, term } from '#/shared/db/schema.ts';
import { zuFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Leistung, Notensystem } from '#/shared/noten/notenwert.ts';
import { fachschnitt } from '#/shared/noten/notenwert.ts';
import {
  formatHalbnote,
  formatNote,
  halbjahresnote,
  jahresnote,
} from '#/shared/noten/zeugnisnote.ts';
import { ZeugnisHalbjahrNichtGefunden } from '../errors/zeugnis-errors.ts';

export type ZeugnisZeile = {
  readonly fachId: string;
  readonly fachName: string;
  /** Zeugnisschreibweise, z. B. "2+" oder "11 P."; null ohne Noten. */
  readonly anzeige: string | null;
  readonly anzahlNoten: number;
};

export type JahresZeile = {
  readonly fachId: string;
  readonly fachName: string;
  readonly note: number;
  readonly grenzfall: boolean;
};

export type Zeugnis = {
  readonly termId: string;
  readonly label: string;
  readonly schoolYear: string;
  readonly system: Notensystem;
  /** Mittel der Halbjahresnoten im nativen System, formatiert; null ohne Noten. */
  readonly gesamtschnitt: string | null;
  readonly zeilen: ReadonlyArray<ZeugnisZeile>;
  readonly jahreszeugnis: ReadonlyArray<JahresZeile> | null;
};

type NotenZeile = typeof grade.$inferSelect;

const zuLeistung = (note: NotenZeile): Leistung => ({
  value: Number(note.value),
  weight: Number(note.weight),
  kind: note.kind,
  area: note.area,
});

const notenProFach = (noten: ReadonlyArray<NotenZeile>) => {
  const gruppen = new Map<string, Array<NotenZeile>>();
  for (const note of noten) {
    const liste = gruppen.get(note.subjectId);
    if (liste === undefined) {
      gruppen.set(note.subjectId, [note]);
    } else {
      liste.push(note);
    }
  }
  return gruppen;
};

const anzeigeFuer = (halbnote: number, system: Notensystem): string =>
  system === 'punkte' ? `${halbnote} P.` : formatHalbnote(halbnote);

/** Jahreszeugnis-Zeilen, wenn das Schuljahr genau zwei Sechser-Halbjahre hat. */
const jahresZeilen = (
  halbjahrIds: ReadonlyArray<string>,
  faecher: ReadonlyArray<typeof subject.$inferSelect>,
) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const noten = yield* db
      .select()
      .from(grade)
      .where(inArray(grade.termId, [...halbjahrIds]));
    const gruppen = notenProFach(noten);
    return faecher.flatMap((fach): ReadonlyArray<JahresZeile> => {
      const schnitt = fachschnitt(
        (gruppen.get(fach.id) ?? []).map(zuLeistung),
        zuFachgewichtung(fach),
      );
      if (schnitt === null) {
        return [];
      }
      const jahr = jahresnote(schnitt);
      return [
        {
          fachId: fach.id,
          fachName: fach.name,
          note: jahr.note,
          grenzfall: jahr.grenzfall,
        },
      ];
    });
  });

export const ladeZeugnis = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db.select().from(term).where(eq(term.id, termId));
    const [halbjahr] = halbjahre;
    if (halbjahr === undefined) {
      return yield* Effect.fail(new ZeugnisHalbjahrNichtGefunden({ termId }));
    }
    const faecher = yield* db
      .select()
      .from(subject)
      .where(eq(subject.archived, false))
      .orderBy(asc(subject.sortOrder), asc(subject.name));
    const noten = yield* db
      .select()
      .from(grade)
      .where(eq(grade.termId, termId));
    const gruppen = notenProFach(noten);

    const halbnoten: Array<number> = [];
    const zeilen = faecher.map((fach): ZeugnisZeile => {
      const fachNoten = gruppen.get(fach.id) ?? [];
      const schnitt = fachschnitt(
        fachNoten.map(zuLeistung),
        zuFachgewichtung(fach),
      );
      const halbnote =
        schnitt === null ? null : halbjahresnote(schnitt, halbjahr.system);
      if (halbnote !== null) {
        halbnoten.push(halbnote);
      }
      return {
        fachId: fach.id,
        fachName: fach.name,
        anzeige:
          halbnote === null ? null : anzeigeFuer(halbnote, halbjahr.system),
        anzahlNoten: fachNoten.length,
      };
    });

    const sechserHalbjahre =
      halbjahr.system === 'sechser'
        ? yield* db
            .select({ id: term.id })
            .from(term)
            .where(
              and(
                eq(term.schoolYear, halbjahr.schoolYear),
                eq(term.system, 'sechser'),
              ),
            )
        : [];
    const jahreszeugnis =
      sechserHalbjahre.length === 2
        ? yield* jahresZeilen(
            sechserHalbjahre.map((eintrag) => eintrag.id),
            faecher,
          )
        : null;

    const gesamtschnitt =
      halbnoten.length === 0
        ? null
        : formatNote(
            halbnoten.reduce((summe, wert) => summe + wert, 0) /
              halbnoten.length,
            halbjahr.system,
          );

    return {
      termId: halbjahr.id,
      label: halbjahr.label,
      schoolYear: halbjahr.schoolYear,
      system: halbjahr.system,
      gesamtschnitt,
      zeilen,
      jahreszeugnis,
    } satisfies Zeugnis;
  });
