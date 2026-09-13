/**
 * Dringlichkeit einer ausstehenden Leistung: ihr Anteil am Fachschnitt,
 * gestreckt durch die verbleibenden Tage. Damit stehen eine Klausur in zehn
 * Tagen und ein kleiner Test morgen etwa gleich, und was übermorgen kommt,
 * überholt, was erst in einem Monat ansteht. Größer heißt dringender; ein
 * bereits verstrichener Termin zählt wie heute.
 *
 * Der Anteil selbst wird nie angezeigt: er verschiebt sich, sobald eine
 * weitere Leistung angekündigt wird. Er ordnet nur.
 */
export const dringlichkeit = ({
  anteil,
  tageBis,
}: {
  /** Anteil am Fachschnitt, 0–1, aus `leistungsanteile`. */
  readonly anteil: number;
  /** Tage bis zum Termin; negativ, wenn er vorbei ist. */
  readonly tageBis: number;
}): number => anteil / (Math.max(0, tageBis) + 1);

/** Sortiert ausstehende Leistungen: dringendste zuerst, bei Gleichstand die frühere. */
export const byDringlichkeit = <
  Leistung extends { readonly anteil: number; readonly tageBis: number },
>(
  left: Leistung,
  right: Leistung,
): number =>
  dringlichkeit(right) - dringlichkeit(left) || left.tageBis - right.tageBis;
