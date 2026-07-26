import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { istIsoDatumImZeitraum } from '#/shared/datum/zeitraum.ts';
import { term } from '#/shared/db/schema.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { ladeSchuljahrFachstand } from '#/shared/noten/schuljahr-fachstand.ts';
import {
  FachNichtImSchuljahr,
  HalbjahrNichtGefunden,
  NoteAusserhalbHalbjahr,
  UngueltigerNotenwert,
} from '../errors/noten-errors.ts';
import { istFachWaehlbar, istWertGueltig } from './notenpruefung.ts';

/**
 * Die Invarianten jeder Notenmutation. Sie laufen innerhalb der Transaktion,
 * die auch das Halbjahr sperrt, damit ein gleichzeitiger Halbjahr- oder
 * Fachwechsel sie nicht unterlaufen kann.
 */

export const pruefeWert = (wert: number, system: Notensystem) =>
  istWertGueltig(wert, system)
    ? Effect.void
    : Effect.fail(new UngueltigerNotenwert({ wert, system }));

export const pruefeDatum = (
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

export const ladeHalbjahrGesperrt = (termId: string) =>
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

/**
 * `bisherigesFach` ist das Fach, an dem die Note schon hängt — beim Eintragen
 * einer neuen Note `null`. Nur dieses eine Fach darf archiviert sein.
 */
export const pruefeFach = (
  subjectId: string,
  schoolYear: string,
  bisherigesFach: string | null,
) =>
  Effect.gen(function* () {
    const faecher = yield* ladeSchuljahrFachstand(schoolYear);
    const fach = faecher.find((eintrag) => eintrag.id === subjectId);
    if (!istFachWaehlbar(fach, bisherigesFach)) {
      return yield* Effect.fail(
        new FachNichtImSchuljahr({ fachId: subjectId, schoolYear }),
      );
    }
  });
