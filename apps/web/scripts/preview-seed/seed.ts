import { getTableName } from 'drizzle-orm';
import { Effect, Schema } from 'effect';
import { SqlClient } from 'effect/sql/SqlClient';
import {
  FachInput,
  FachUpdate,
} from '#/features/faecher/schemas/fach-schema.ts';
import {
  archiveFach,
  createFach,
  listFaecher,
  updateFach,
} from '#/features/faecher/services/fach-service.ts';
import { HalbjahrInput } from '#/features/halbjahre/schemas/halbjahr-schema.ts';
import {
  createHalbjahr,
  listHalbjahre,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import { StudyDayInput } from '#/features/lernen/schemas/study-day-schema.ts';
import { logStudyDay } from '#/features/lernen/services/learning-service.ts';
import {
  NoteInput,
  PreparationTemplateInput,
  PreparationUpdate,
} from '#/features/noten/schemas/note-schema.ts';
import {
  createNote,
  listNoten,
  updatePreparation,
} from '#/features/noten/services/noten-service.ts';
import { savePreparationTemplate } from '#/features/noten/services/preparation-template-service.ts';
import {
  account,
  session,
  user,
  verification,
} from '#/shared/auth/auth-schema.ts';
import type { SamplePlan, SampleSchoolYear } from './sample-data.ts';
import { halbjahrKey, leistungKey, samplePlan } from './sample-data.ts';
import type { SampleFach } from './sample-faecher.ts';

/**
 * Legt die erfundenen Beispieldaten einer Pull-Request-Preview an, aber nur in
 * einer Datenbank ohne App-Daten. Alles läuft durch die Services und ihre
 * Eingabeschemas, damit die Beispieldaten dieselben Regeln erfüllen wie
 * Eingaben aus der App, und in einer Transaktion: Scheitert ein Schritt, bleibt
 * die Datenbank leer.
 */

/**
 * Tabellen von Better Auth. Eine Anmeldung allein legt keine App-Daten an, und
 * keine App-Zeile gehört einem Nutzer: Die Anmeldung mit dem zugelassenen
 * GitHub-Konto sieht die Beispieldaten ohne eigenen Nutzer.
 */
const authTables: ReadonlySet<string> = new Set(
  [user, session, account, verification].map((table) => getTableName(table)),
);

/**
 * Hält einen zweiten, gleichzeitigen Seed hinter dem ersten zurück, damit nicht
 * beide eine leere Datenbank sehen. Ein einzelner Schlüssel teilt sich keinen
 * Raum mit den zweiteiligen Sperren des Fachstands; die Zahl ist "seed" in
 * ASCII.
 */
const seedLockKey = 1_936_024_932;

export type SeedCounts = {
  readonly halbjahre: number;
  readonly faecher: number;
  readonly benotet: number;
  readonly ausstehend: number;
  readonly lerntage: number;
};

export type SeedResult =
  | { readonly status: 'skipped'; readonly tables: ReadonlyArray<string> }
  | { readonly status: 'seeded'; readonly counts: SeedCounts };

/** App-Tabellen, die schon Zeilen haben. */
const tablesWithRows = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const tables = yield* sql<{ readonly tableName: string }>`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const appTables = tables
    .map((table) => table.tableName)
    .filter((table) => !authTables.has(table));
  const filled = yield* Effect.forEach(appTables, (table) =>
    sql<{ readonly found: boolean }>`
      SELECT EXISTS (SELECT 1 FROM ${sql(table)}) AS found
    `.pipe(Effect.map(([row]) => (row?.found === true ? [table] : []))),
  );
  return filled.flat();
});

/** Ein Verweis im Plan, der nicht aufgeht, ist ein Fehler im Seed selbst. */
const lookup = (ids: ReadonlyMap<string, string>, key: string) => {
  const id = ids.get(key);
  return id === undefined
    ? Effect.die(new Error(`Beispieldaten verweisen auf Unbekanntes: ${key}`))
    : Effect.succeed(id);
};

const fachFields = (schoolYear: string, fach: SampleFach) => ({
  schoolYear,
  name: fach.name,
  shortName: fach.shortName,
  gewichtung: fach.gewichtung,
});

/**
 * Legt die Halbjahre eines Schuljahrs an, das den Fachstand des Vorjahrs
 * übernimmt, und ändert dann seine Fächer. Liefert die Fach-IDs nach Kürzel;
 * sie gelten in allen Schuljahren.
 */
const applySchoolYear = (year: SampleSchoolYear) =>
  Effect.gen(function* () {
    for (const halbjahr of year.halbjahre) {
      yield* createHalbjahr(
        yield* Schema.decodeUnknownEffect(HalbjahrInput)(halbjahr),
      );
    }
    for (const fach of year.addedFaecher) {
      yield* createFach(
        yield* Schema.decodeUnknownEffect(FachInput)(
          fachFields(year.schoolYear, fach),
        ),
      );
    }
    const fachIds = new Map(
      (yield* listFaecher(year.schoolYear)).map(
        (fach) => [fach.shortName, fach.id] as const,
      ),
    );
    for (const fach of year.changedFaecher) {
      const id = yield* lookup(fachIds, fach.shortName);
      yield* updateFach(
        yield* Schema.decodeUnknownEffect(FachUpdate)({
          id,
          ...fachFields(year.schoolYear, fach),
        }),
      );
    }
    for (const shortName of year.archivedFaecher) {
      yield* archiveFach(yield* lookup(fachIds, shortName), year.schoolYear);
    }
    return fachIds;
  });

type PlanIds = {
  readonly halbjahre: ReadonlyMap<string, string>;
  readonly faecher: ReadonlyMap<string, string>;
};

const createLeistungen = (plan: SamplePlan, ids: PlanIds) =>
  Effect.forEach(
    plan.leistungen,
    (leistung) =>
      Effect.gen(function* () {
        const termId = yield* lookup(
          ids.halbjahre,
          halbjahrKey(leistung.schoolYear, leistung.half),
        );
        const subjectId = yield* lookup(ids.faecher, leistung.fach);
        yield* createNote(
          yield* Schema.decodeUnknownEffect(NoteInput)({
            termId,
            subjectId,
            kind: leistung.kind,
            wert: leistung.wert,
            gewicht: leistung.gewicht,
            datum: leistung.datum,
            notiz: leistung.notiz,
          }),
        );
      }),
    { discard: true },
  );

/** Die IDs der angelegten Leistungen nach ihrem Schlüssel im Plan. */
const loadLeistungIds = (
  halbjahre: ReadonlyArray<{
    readonly id: string;
    readonly schoolYear: string;
    readonly half: 1 | 2;
  }>,
) =>
  Effect.forEach(halbjahre, (halbjahr) =>
    listNoten(halbjahr.id).pipe(
      Effect.map((leistungen) =>
        leistungen.map(
          (leistung) =>
            [
              leistungKey({
                schoolYear: halbjahr.schoolYear,
                half: halbjahr.half,
                fach: leistung.fachKuerzel,
                kind: leistung.kind,
                datum: leistung.datum,
              }),
              leistung.id,
            ] as const,
        ),
      ),
    ),
  ).pipe(Effect.map((entries) => new Map(entries.flat())));

const addPreparations = (
  plan: SamplePlan,
  leistungIds: ReadonlyMap<string, string>,
) =>
  Effect.forEach(
    plan.leistungen.filter((leistung) => leistung.preparation !== null),
    (leistung) =>
      Effect.gen(function* () {
        const id = yield* lookup(leistungIds, leistung.key);
        yield* updatePreparation(
          yield* Schema.decodeUnknownEffect(PreparationUpdate)({
            id,
            preparation: leistung.preparation,
          }),
        );
      }),
    { discard: true },
  );

const logStudyDays = (
  plan: SamplePlan,
  ids: PlanIds & { readonly leistungen: ReadonlyMap<string, string> },
) =>
  Effect.forEach(
    plan.studyDays,
    (studyDay) =>
      Effect.gen(function* () {
        const subjectId =
          studyDay.fach === null
            ? null
            : yield* lookup(ids.faecher, studyDay.fach);
        const gradeId =
          studyDay.leistungKey === null
            ? null
            : yield* lookup(ids.leistungen, studyDay.leistungKey);
        yield* logStudyDay(
          yield* Schema.decodeUnknownEffect(StudyDayInput)({
            day: studyDay.day,
            subjectId,
            gradeId,
            minutes: studyDay.minutes,
            notiz: studyDay.notiz,
          }),
        );
      }),
    { discard: true },
  );

const applyPlan = (plan: SamplePlan) =>
  Effect.gen(function* () {
    const faecher = new Map<string, string>();
    for (const year of plan.schoolYears) {
      for (const [shortName, id] of yield* applySchoolYear(year)) {
        faecher.set(shortName, id);
      }
    }
    const halbjahre = yield* listHalbjahre;
    const ids = {
      faecher,
      halbjahre: new Map(
        halbjahre.map(
          (halbjahr) =>
            [
              halbjahrKey(halbjahr.schoolYear, halbjahr.half),
              halbjahr.id,
            ] as const,
        ),
      ),
    };
    yield* createLeistungen(plan, ids);
    const leistungen = yield* loadLeistungIds(halbjahre);
    yield* addPreparations(plan, leistungen);
    yield* logStudyDays(plan, { ...ids, leistungen });
    for (const template of plan.preparationTemplates) {
      yield* savePreparationTemplate(
        yield* Schema.decodeUnknownEffect(PreparationTemplateInput)(template),
      );
    }
    const ausstehend = plan.leistungen.filter(
      (leistung) => leistung.wert === null,
    ).length;
    return {
      halbjahre: halbjahre.length,
      faecher: faecher.size,
      benotet: plan.leistungen.length - ausstehend,
      ausstehend,
      lerntage: plan.studyDays.length,
    } satisfies SeedCounts;
  });

/** Legt die Beispieldaten für `today` an, sofern die Datenbank keine App-Daten hält. */
export const seedPreview = (today: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql.withTransaction(
      Effect.gen(function* () {
        yield* sql`SELECT pg_advisory_xact_lock(${seedLockKey})`;
        const tables = yield* tablesWithRows;
        if (tables.length > 0) {
          return { status: 'skipped', tables } satisfies SeedResult;
        }
        const counts = yield* applyPlan(samplePlan(today));
        return { status: 'seeded', counts } satisfies SeedResult;
      }),
    );
  });
