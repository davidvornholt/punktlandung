import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import { nextKlassenstufe } from '#/shared/school/klassenstufe.ts';
import {
  halbjahrDateRange,
  halbjahrForDate,
  nextSchoolYear,
  schoolYearForDate,
} from '#/shared/school/school-year.ts';
import type { HalbjahrInput } from '../schemas/halbjahr-schema.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';

/**
 * Editierbarer Formularzustand. Notensystem und Bezeichnung sind vollständig
 * abgeleitet; der Zeitraum folgt den amtlichen Grenzen, solange ihn niemand
 * ausdrücklich angepasst hat.
 */
export type HalbjahrFormValues = {
  readonly klassenstufe: Klassenstufe;
  readonly schoolYear: string;
  readonly half: 1 | 2;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly dateRangeAdjusted: boolean;
};

const occupancyKey = (halbjahr: {
  readonly schoolYear: string;
  readonly half: number;
}) => `${halbjahr.schoolYear}\u0000${halbjahr.half}`;

/** Schuljahr-und-Halbjahr-Kombinationen, die bereits vergeben sind. */
export const occupiedHalbjahre = (
  halbjahre: ReadonlyArray<Halbjahr>,
  excluded: Halbjahr | null,
): ReadonlySet<string> =>
  new Set(
    halbjahre
      .filter((halbjahr) => halbjahr.id !== excluded?.id)
      .map(occupancyKey),
  );

export const isOccupied = (
  occupied: ReadonlySet<string>,
  schoolYear: string,
  half: 1 | 2,
): boolean => occupied.has(occupancyKey({ schoolYear, half }));

const mostRecentlyStarted = (
  halbjahre: ReadonlyArray<Halbjahr>,
): Halbjahr | null =>
  halbjahre.reduce<Halbjahr | null>(
    (latest, halbjahr) =>
      latest === null || halbjahr.startsOn > latest.startsOn
        ? halbjahr
        : latest,
    null,
  );

const withOfficialDateRange = (values: {
  readonly klassenstufe: Klassenstufe;
  readonly schoolYear: string;
  readonly half: 1 | 2;
}): HalbjahrFormValues => ({
  ...values,
  ...halbjahrDateRange(values.schoolYear, values.half),
  dateRangeAdjusted: false,
});

/**
 * Vorschlag für ein neues Halbjahr: das auf das zuletzt begonnene folgende.
 * Ohne Bestand entscheidet das heutige Datum über Schuljahr und Halbjahr.
 */
export const newHalbjahrSuggestion = (
  halbjahre: ReadonlyArray<Halbjahr>,
  today: string,
): HalbjahrFormValues => {
  const last = mostRecentlyStarted(halbjahre);
  if (last === null) {
    return withOfficialDateRange({
      klassenstufe: '5',
      schoolYear: schoolYearForDate(today),
      half: halbjahrForDate(today),
    });
  }
  if (last.half === 1) {
    return withOfficialDateRange({
      klassenstufe: last.klassenstufe,
      schoolYear: last.schoolYear,
      half: 2,
    });
  }
  return withOfficialDateRange({
    klassenstufe: nextKlassenstufe(last.klassenstufe) ?? last.klassenstufe,
    schoolYear: nextSchoolYear(last.schoolYear),
    half: 1,
  });
};

/** Ausgangszustand des Formulars für Anlegen oder Bearbeiten. */
export const halbjahrFormValues = (
  halbjahr: Halbjahr | null,
  halbjahre: ReadonlyArray<Halbjahr>,
  today: string,
): HalbjahrFormValues => {
  if (halbjahr === null) {
    return newHalbjahrSuggestion(halbjahre, today);
  }
  const official = halbjahrDateRange(halbjahr.schoolYear, halbjahr.half);
  return {
    klassenstufe: halbjahr.klassenstufe,
    schoolYear: halbjahr.schoolYear,
    half: halbjahr.half,
    startsOn: halbjahr.startsOn,
    endsOn: halbjahr.endsOn,
    dateRangeAdjusted:
      halbjahr.startsOn !== official.startsOn ||
      halbjahr.endsOn !== official.endsOn,
  };
};

/**
 * Zieht Schuljahr- oder Halbjahreswechsel in den Zeitraum nach, solange dieser
 * nicht von Hand angepasst wurde.
 */
export const withUpdatedDateRange = (
  values: HalbjahrFormValues,
): HalbjahrFormValues =>
  values.dateRangeAdjusted
    ? values
    : { ...values, ...halbjahrDateRange(values.schoolYear, values.half) };

/** Der zu speichernde Datensatz; das Notensystem leitet der Server ab. */
export const toHalbjahrInput = (values: HalbjahrFormValues): HalbjahrInput => ({
  klassenstufe: values.klassenstufe,
  schoolYear: values.schoolYear,
  half: values.half,
  startsOn: values.startsOn,
  endsOn: values.endsOn,
});
