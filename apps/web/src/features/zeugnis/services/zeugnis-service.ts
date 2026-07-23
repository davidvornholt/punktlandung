import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { and, eq, inArray } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, term } from '#/shared/db/schema.ts';
import { zuFachgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Leistung, Notensystem } from '#/shared/noten/notenwert.ts';
import { fachschnitt } from '#/shared/noten/notenwert.ts';
import type { SchuljahrFach } from '#/shared/noten/schuljahr-fachstand.ts';
import { ladeSchuljahrFachstand } from '#/shared/noten/schuljahr-fachstand.ts';
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
  readonly anzeige: string | null;
  readonly anzahlNoten: number;
};

export type JahresvorschauZeile = {
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
  readonly zeilen: ReadonlyArray<ZeugnisZeile>;
  readonly jahresvorschau: ReadonlyArray<JahresvorschauZeile> | null;
};

type NotenZeile = Pick<
  typeof grade.$inferSelect,
  'subjectId' | 'value' | 'weight' | 'kind' | 'area'
>;

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

/** Nicht bindende Ganznoten-Vorschau aus allen Leistungen des Schuljahrs. */
export const berechneJahresvorschau = (
  noten: ReadonlyArray<NotenZeile>,
  faecher: ReadonlyArray<SchuljahrFach>,
): ReadonlyArray<JahresvorschauZeile> => {
  const gruppen = notenProFach(noten);
  return faecher.flatMap((fach): ReadonlyArray<JahresvorschauZeile> => {
    const schnitt = fachschnitt(
      (gruppen.get(fach.id) ?? []).map(zuLeistung),
      zuFachgewichtung(fach),
    );
    if (schnitt === null) {
      return [];
    }
    const vorschau = jahresnote(schnitt);
    return [
      {
        fachId: fach.id,
        fachName: fach.name,
        note: vorschau.note,
        grenzfall: vorschau.grenzfall,
      },
    ];
  });
};

export const istVollstaendigesSchuljahr = (
  halbjahre: ReadonlyArray<{ readonly half: number }>,
): boolean =>
  halbjahre.length === 2 &&
  halbjahre.some((eintrag) => eintrag.half === 1) &&
  halbjahre.some((eintrag) => eintrag.half === 2);

export const ladeZeugnis = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const halbjahre = yield* db.select().from(term).where(eq(term.id, termId));
    const [halbjahr] = halbjahre;
    if (halbjahr === undefined) {
      return yield* Effect.fail(new ZeugnisHalbjahrNichtGefunden({ termId }));
    }
    const fachstand = yield* ladeSchuljahrFachstand(halbjahr.schoolYear);
    const faecher = fachstand.filter((fach) => !fach.archived);
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
            .select({ id: term.id, half: term.half })
            .from(term)
            .where(
              and(
                eq(term.schoolYear, halbjahr.schoolYear),
                eq(term.system, 'sechser'),
              ),
            )
        : [];
    const vollstaendigesJahr = istVollstaendigesSchuljahr(sechserHalbjahre);
    const jahresnoten = vollstaendigesJahr
      ? yield* db
          .select()
          .from(grade)
          .where(
            inArray(
              grade.termId,
              sechserHalbjahre.map((eintrag) => eintrag.id),
            ),
          )
      : [];
    const jahresvorschau = vollstaendigesJahr
      ? berechneJahresvorschau(jahresnoten, faecher)
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
      jahresvorschau,
    } satisfies Zeugnis;
  });
