import type { noteTable } from '#/shared/db/schema.ts';
import type { Assessment } from './notenwert.ts';

type GradeRow = Pick<
  typeof noteTable.$inferSelect,
  'value' | 'weight' | 'kind'
>;

/** Eine Leistung, deren Note eingetragen ist. */
export type GradedRow<Row extends GradeRow> = Row & { readonly value: string };

/**
 * Die eine Stelle, an der ausstehende Leistungen aus der Notenmathematik
 * fallen. Jeder Schnitt, der Verlauf und das Zeugnis lesen `grade`-Zeilen und
 * dürfen nur benotete an `toAssessment` reichen — der Typ erzwingt das.
 */
export const isGraded = <Row extends GradeRow>(
  row: Row,
): row is GradedRow<Row> => row.value !== null;

export const toAssessment = (row: GradedRow<GradeRow>): Assessment => ({
  notenwert: Number(row.value),
  individualGewichtung: Number(row.weight),
  leistungsart: row.kind,
});
