import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { and, eq, inArray } from 'drizzle-orm';
import { Effect } from 'effect';

import { halbjahrTable, noteTable } from '#/shared/db/schema.ts';
import { toFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Assessment, Notensystem } from '#/shared/noten/notenwert.ts';
import { fachAverage } from '#/shared/noten/notenwert.ts';
import type { SchoolYearFach } from '#/shared/noten/school-year-fach-snapshot.ts';
import { loadSchoolYearFachSnapshot } from '#/shared/noten/school-year-fach-snapshot.ts';
import {
  formatHalbnote,
  formatNote,
  halbjahresnote,
  jahresnote,
} from '#/shared/noten/zeugnisnote.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { ZeugnisHalbjahrNotFound } from '../errors/zeugnis-errors.ts';

export type ZeugnisRow = {
  readonly fachId: string;
  readonly fachName: string;
  readonly anzeige: string | null;
  readonly anzahlNoten: number;
};

export type JahresvorschauRow = {
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
  readonly gesamtschnitt: string | null;
  readonly zeilen: ReadonlyArray<ZeugnisRow>;
  readonly jahresvorschau: ReadonlyArray<JahresvorschauRow> | null;
};

type NoteRow = Pick<
  typeof noteTable.$inferSelect,
  'subjectId' | 'value' | 'weight' | 'kind' | 'area'
>;

const toAssessment = (note: NoteRow): Assessment => ({
  notenwert: Number(note.value),
  individualGewichtung: Number(note.weight),
  leistungsart: note.kind,
  wertungsbereich: note.area,
});

const groupNotenByFach = (noten: ReadonlyArray<NoteRow>) => {
  const groups = new Map<string, Array<NoteRow>>();
  for (const note of noten) {
    const list = groups.get(note.subjectId);
    if (list === undefined) {
      groups.set(note.subjectId, [note]);
    } else {
      list.push(note);
    }
  }
  return groups;
};

const displayFor = (halbnote: number, system: Notensystem): string =>
  system === 'punkte' ? `${halbnote} P.` : formatHalbnote(halbnote);

/** Nicht bindende Ganznoten-Vorschau aus allen Leistungen des Schuljahrs. */
export const calculateJahresvorschau = (
  noten: ReadonlyArray<NoteRow>,
  faecher: ReadonlyArray<SchoolYearFach>,
): ReadonlyArray<JahresvorschauRow> => {
  const groups = groupNotenByFach(noten);
  return faecher.flatMap((fach): ReadonlyArray<JahresvorschauRow> => {
    const average = fachAverage(
      (groups.get(fach.id) ?? []).map(toAssessment),
      toFachgewichtung(fach),
    );
    if (average === null) {
      return [];
    }
    const preview = jahresnote(average);
    return [
      {
        fachId: fach.id,
        fachName: fach.name,
        note: preview.note,
        grenzfall: preview.grenzfall,
      },
    ];
  });
};

export const isCompleteSchoolYear = (
  halbjahre: ReadonlyArray<{ readonly half: number }>,
): boolean =>
  halbjahre.length === 2 &&
  halbjahre.some((entry) => entry.half === 1) &&
  halbjahre.some((entry) => entry.half === 2);

export const loadZeugnis = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db
      .select()
      .from(halbjahrTable)
      .where(eq(halbjahrTable.id, termId));
    const [halbjahr] = halbjahre;
    if (halbjahr === undefined) {
      return yield* Effect.fail(new ZeugnisHalbjahrNotFound({ termId }));
    }
    const fachSnapshot = yield* loadSchoolYearFachSnapshot(halbjahr.schoolYear);
    const faecher = fachSnapshot.filter((fach) => !fach.archived);
    const noten = yield* db
      .select()
      .from(noteTable)
      .where(eq(noteTable.termId, termId));
    const groups = groupNotenByFach(noten);

    const halbnoten: Array<number> = [];
    const zeilen = faecher.map((fach): ZeugnisRow => {
      const fachNoten = groups.get(fach.id) ?? [];
      const average = fachAverage(
        fachNoten.map(toAssessment),
        toFachgewichtung(fach),
      );
      const halbnote =
        average === null ? null : halbjahresnote(average, halbjahr.system);
      if (halbnote !== null) {
        halbnoten.push(halbnote);
      }
      return {
        fachId: fach.id,
        fachName: fach.name,
        anzeige:
          halbnote === null ? null : displayFor(halbnote, halbjahr.system),
        anzahlNoten: fachNoten.length,
      };
    });

    const sechserHalbjahre =
      halbjahr.system === 'sechser'
        ? yield* db
            .select({
              id: halbjahrTable.id,
              half: halbjahrTable.half,
            })
            .from(halbjahrTable)
            .where(
              and(
                eq(halbjahrTable.schoolYear, halbjahr.schoolYear),
                eq(halbjahrTable.system, 'sechser'),
              ),
            )
        : [];
    const completeYear = isCompleteSchoolYear(sechserHalbjahre);
    const jahresnoten = completeYear
      ? yield* db
          .select()
          .from(noteTable)
          .where(
            inArray(
              noteTable.termId,
              sechserHalbjahre.map((entry) => entry.id),
            ),
          )
      : [];
    const jahresvorschau = completeYear
      ? calculateJahresvorschau(jahresnoten, faecher)
      : null;

    const gesamtschnitt =
      halbnoten.length === 0
        ? null
        : formatNote(
            halbnoten.reduce((total, value) => total + value, 0) /
              halbnoten.length,
            halbjahr.system,
          );

    return {
      termId: halbjahr.id,
      label: formatHalbjahrLabel(halbjahr),
      schoolYear: halbjahr.schoolYear,
      system: halbjahr.system,
      gesamtschnitt,
      zeilen,
      jahresvorschau,
    } satisfies Zeugnis;
  });
