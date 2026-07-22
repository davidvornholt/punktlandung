import { Data, Effect } from 'effect';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import { LegacyReconciliationDatabaseError } from './legacy-reconciliation-database-error.ts';

type TermRow = QueryResultRow & {
  readonly id: string;
  readonly label: string;
  readonly schoolYear: string;
  readonly half: number;
  readonly system: string;
  readonly startsOn: string;
  readonly endsOn: string;
};

type StudyDayRow = QueryResultRow & {
  readonly id: string;
  readonly day: string;
  readonly subjectId: string | null;
  readonly minutes: number | null;
  readonly note: string | null;
};

export class LegacyDataConflict extends Data.TaggedError('LegacyDataConflict')<{
  readonly message: string;
}> {}

const query = <Row extends QueryResultRow>(
  client: PoolClient,
  text: string,
  values: ReadonlyArray<unknown> = [],
) =>
  Effect.tryPromise({
    try: () => client.query<Row>(text, [...values]),
    catch: (cause) =>
      new LegacyReconciliationDatabaseError({
        message:
          'Die Prüfung bestehender Daten vor der Migration ist fehlgeschlagen.',
        cause,
      }),
  });

const gruppiere = <Row>(
  rows: ReadonlyArray<Row>,
  key: (row: Row) => string,
): ReadonlyArray<ReadonlyArray<Row>> => {
  const groups = new Map<string, Array<Row>>();
  for (const row of rows) {
    const groupKey = key(row);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
};

const termMetadata = (row: TermRow): string =>
  [row.label, row.system, row.startsOn, row.endsOn].join('\u0000');

const studyDayData = (row: StudyDayRow): string =>
  JSON.stringify([row.minutes, row.note]);

const conflictMessage = (
  termConflicts: ReadonlyArray<ReadonlyArray<TermRow>>,
  studyDayConflicts: ReadonlyArray<ReadonlyArray<StudyDayRow>>,
): string => {
  const termLines = termConflicts.map((group) => {
    const [first] = group;
    return `Halbjahr ${first?.schoolYear}/${first?.half}: Zeilen ${group.map(({ id }) => id).join(', ')} unterscheiden sich in Bezeichnung, Notensystem oder Zeitraum. Gleichen Sie die Metadaten an oder führen Sie die Zeilen samt Noten manuell zusammen.`;
  });
  const studyDayLines = studyDayConflicts.map((group) => {
    const [first] = group;
    const subject = first?.subjectId ?? 'ohne Fach';
    return `Lerntag ${first?.day}/${subject}: Zeilen ${group.map(({ id }) => id).join(', ')} haben unterschiedliche Minuten oder Notizen. Führen Sie diese Zeilen manuell zusammen.`;
  });
  return [
    'Die Migration wurde vor Schemaänderungen abgebrochen, weil doppelte Bestandsdaten nicht verlustfrei automatisch zusammengeführt werden können:',
    ...termLines,
    ...studyDayLines,
  ].join('\n');
};

const mergeTerms = (
  client: PoolClient,
  groups: ReadonlyArray<ReadonlyArray<TermRow>>,
) =>
  Effect.gen(function* () {
    for (const group of groups) {
      const [canonical, ...duplicates] = group;
      if (canonical !== undefined && duplicates.length > 0) {
        const duplicateIds = duplicates.map(({ id }) => id);
        yield* query(
          client,
          'UPDATE grade SET term_id = $1 WHERE term_id = ANY($2::text[])',
          [canonical.id, duplicateIds],
        );
        yield* query(client, 'DELETE FROM term WHERE id = ANY($1::text[])', [
          duplicateIds,
        ]);
      }
    }
  });

const mergeStudyDays = (
  client: PoolClient,
  groups: ReadonlyArray<ReadonlyArray<StudyDayRow>>,
) =>
  Effect.gen(function* () {
    for (const group of groups) {
      const [, ...duplicates] = group;
      if (duplicates.length > 0) {
        yield* query(
          client,
          'DELETE FROM study_day WHERE id = ANY($1::text[])',
          [duplicates.map(({ id }) => id)],
        );
      }
    }
  });

const reconcileInTransaction = (client: PoolClient) =>
  Effect.gen(function* () {
    const tables = yield* query<{ readonly ready: boolean }>(
      client,
      `SELECT to_regclass('public.term') IS NOT NULL
          AND to_regclass('public.grade') IS NOT NULL
          AND to_regclass('public.study_day') IS NOT NULL AS ready`,
    );
    if (tables.rows[0]?.ready !== true) {
      return;
    }

    yield* query(
      client,
      'LOCK TABLE term, grade, study_day IN SHARE ROW EXCLUSIVE MODE',
    );
    const terms = yield* query<TermRow>(
      client,
      `SELECT id, label, school_year AS "schoolYear", half, system,
              starts_on AS "startsOn", ends_on AS "endsOn"
         FROM term
        ORDER BY school_year, half, id`,
    );
    const studyDays = yield* query<StudyDayRow>(
      client,
      `SELECT id, day, subject_id AS "subjectId", minutes, note
         FROM study_day
        ORDER BY day, subject_id NULLS FIRST, id`,
    );
    const termGroups = gruppiere(
      terms.rows,
      (row) => `${row.schoolYear}\u0000${row.half}`,
    );
    const studyDayGroups = gruppiere(
      studyDays.rows,
      (row) => `${row.day}\u0000${row.subjectId ?? ''}`,
    );
    const termConflicts = termGroups.filter(
      (group) => new Set(group.map(termMetadata)).size > 1,
    );
    const studyDayConflicts = studyDayGroups.filter(
      (group) => new Set(group.map(studyDayData)).size > 1,
    );
    if (termConflicts.length > 0 || studyDayConflicts.length > 0) {
      return yield* Effect.fail(
        new LegacyDataConflict({
          message: conflictMessage(termConflicts, studyDayConflicts),
        }),
      );
    }

    yield* mergeTerms(client, termGroups);
    yield* mergeStudyDays(client, studyDayGroups);
  });

/** Bereinigt nur verlustfrei zusammenführbare Daten vor neuen Constraints. */
export const reconcileLegacyData = (pool: Pool) =>
  Effect.acquireUseRelease(
    Effect.tryPromise({
      try: () => pool.connect(),
      catch: (cause) =>
        new LegacyReconciliationDatabaseError({
          message:
            'Die Datenbankverbindung für die Migration ist fehlgeschlagen.',
          cause,
        }),
    }),
    (client) =>
      Effect.gen(function* () {
        yield* query(client, 'BEGIN');
        return yield* reconcileInTransaction(client).pipe(
          Effect.tap(() => query(client, 'COMMIT')),
          Effect.tapError(() => query(client, 'ROLLBACK').pipe(Effect.ignore)),
        );
      }),
    (client) => Effect.sync(() => client.release()),
  );
