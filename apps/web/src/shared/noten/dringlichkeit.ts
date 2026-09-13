import type { TopicProgress } from '#/shared/markdown/task-lines.ts';

/**
 * Was an einer Leistung noch offen ist, 0–1: ohne Themenliste alles, sonst
 * der Anteil der noch nicht sicheren Themen.
 */
export const offenerAnteil = (topics: TopicProgress | null): number =>
  topics === null || topics.total === 0
    ? 1
    : (topics.total - topics.checked) / topics.total;

type Dringend = {
  /** Anteil am Fachschnitt, 0–1, aus `leistungsanteile`. */
  readonly anteil: number;
  /** Tage bis zum Termin; negativ, wenn er vorbei ist. */
  readonly tageBis: number;
  /** Fortschritt der Themenliste; null ohne Vorbereitung. */
  readonly topics: TopicProgress | null;
};

/**
 * Dringlichkeit einer ausstehenden Leistung: ihr Anteil am Fachschnitt mal
 * dem, was noch offen ist, gestreckt durch die verbleibenden Tage. Damit
 * stehen eine Klausur in zehn Tagen und ein kleiner Test morgen etwa gleich,
 * was übermorgen kommt, überholt, was erst in einem Monat ansteht, und eine
 * Leistung, deren Themen alle sicher sind, sinkt ans Ende. Größer heißt
 * dringender; ein bereits verstrichener Termin zählt wie heute.
 *
 * Der Anteil selbst wird nie angezeigt: er verschiebt sich, sobald eine
 * weitere Leistung angekündigt wird. Er ordnet nur.
 */
export const dringlichkeit = ({ anteil, tageBis, topics }: Dringend): number =>
  (anteil * offenerAnteil(topics)) / (Math.max(0, tageBis) + 1);

/** Sortiert ausstehende Leistungen: dringendste zuerst, bei Gleichstand die frühere. */
export const byDringlichkeit = <Leistung extends Dringend>(
  left: Leistung,
  right: Leistung,
): number =>
  dringlichkeit(right) - dringlichkeit(left) || left.tageBis - right.tageBis;
