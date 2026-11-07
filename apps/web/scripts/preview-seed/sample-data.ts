import type { HalbjahrInput } from '#/features/halbjahre/schemas/halbjahr-schema.ts';
import type { PreparationTemplateInput } from '#/features/noten/schemas/note-schema.ts';
import { daysBetween } from '#/shared/date/calendar-date.ts';
import type { Leistungsart, Notensystem } from '#/shared/noten/notenwert.ts';
import { toSechser } from '#/shared/noten/notenwert.ts';
import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import { notensystemForKlassenstufe } from '#/shared/school/klassenstufe.ts';
import {
  halbjahrDateRange,
  halbjahrForDate,
  schoolYearForDate,
  schoolYearFromStartYear,
  schoolYearStartYear,
} from '#/shared/school/school-year.ts';
import type { PlannedLeistung } from './sample-calendar.ts';
import {
  plannedLeistungen,
  plannedStudyDays,
  preparationTemplates,
  reviewedPreparation,
} from './sample-calendar.ts';
import type { SampleFach } from './sample-faecher.ts';
import { faecher, kursstufeMath, variation } from './sample-faecher.ts';

/**
 * Erfundene Beispieldaten für Pull-Request-Previews: drei Schuljahre bis
 * heute, damit jede Seite etwas zeigt. Der Plan hängt nur von `today` ab.
 */

export type SampleSchoolYear = {
  readonly schoolYear: string;
  readonly halbjahre: ReadonlyArray<HalbjahrInput>;
  /** Neue Fächer; das erste Schuljahr legt so alle an. */
  readonly addedFaecher: ReadonlyArray<SampleFach>;
  /** Fächer, deren Gewichtung sich gegenüber dem Vorjahr ändert. */
  readonly changedFaecher: ReadonlyArray<SampleFach>;
  /** Kürzel der Fächer, die ab diesem Schuljahr nicht mehr belegt sind. */
  readonly archivedFaecher: ReadonlyArray<string>;
};

export type SampleLeistung = {
  /** Eindeutig im Plan: Halbjahr, Fach, Leistungsart und Datum. */
  readonly key: string;
  readonly schoolYear: string;
  readonly half: 1 | 2;
  /** Fachkürzel. */
  readonly fach: string;
  readonly kind: Leistungsart;
  readonly wert: number | null;
  readonly gewicht: number;
  readonly datum: string;
  readonly notiz: string | null;
  readonly preparation: string | null;
};

export type SampleStudyDay = {
  readonly day: string;
  /** Fachkürzel; null ist ein allgemeiner Lerntag. */
  readonly fach: string | null;
  /** `key` der Leistung, für die gelernt wurde. */
  readonly leistungKey: string | null;
  readonly minutes: number | null;
  readonly notiz: string | null;
};

export type SamplePlan = {
  readonly schoolYears: ReadonlyArray<SampleSchoolYear>;
  readonly leistungen: ReadonlyArray<SampleLeistung>;
  readonly studyDays: ReadonlyArray<SampleStudyDay>;
  readonly preparationTemplates: ReadonlyArray<PreparationTemplateInput>;
};

const isoDateLength = '0000-00-00'.length;

export const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, isoDateLength);
};

/**
 * Klassenstufen ab dem ältesten Schuljahr. Das laufende Schuljahr ist J1; J2
 * entsteht nur, wenn eine angekündigte Leistung schon hineinfällt.
 */
const klassenstufen: ReadonlyArray<Klassenstufe> = ['9', '10', 'J1', 'J2'];
const pastSchoolYears = 2;

const noFachChanges = {
  addedFaecher: [],
  changedFaecher: [],
  archivedFaecher: [],
} as const;

const fachChanges: ReadonlyArray<
  Omit<SampleSchoolYear, 'schoolYear' | 'halbjahre'>
> = [
  {
    ...noFachChanges,
    addedFaecher: [
      faecher.german,
      faecher.math,
      faecher.english,
      faecher.french,
      faecher.physics,
      faecher.biology,
      faecher.history,
    ],
  },
  { ...noFachChanges, addedFaecher: [faecher.chemistry] },
  {
    addedFaecher: [faecher.computerScience],
    changedFaecher: [kursstufeMath],
    archivedFaecher: [faecher.french.shortName],
  },
  noFachChanges,
];

/** Schlüssel eines Halbjahrs, wie ihn auch der Seed aus der Datenbank bildet. */
export const halbjahrKey = (schoolYear: string, half: 1 | 2) =>
  `${schoolYear}:${half}`;

const maxSechserNotenpunkte = 14;
const maxNotenpunkte = 15;

/** Ganze Notenpunkte; im Sechsersystem die passende Notentendenz. */
const valueFor = (notenpunkte: number, system: Notensystem): number => {
  const whole = Math.round(Math.min(maxNotenpunkte, Math.max(0, notenpunkte)));
  return system === 'punkte'
    ? whole
    : toSechser(Math.min(whole, maxSechserNotenpunkte));
};

/** Der Unterricht beginnt erst nach den Sommer- bzw. Faschingsferien. */
const teachingStart = { 1: 0.25, 2: 0.05 } as const;

const scheduledDate = (halbjahr: HalbjahrInput, position: number): string => {
  const span = daysBetween(halbjahr.startsOn, halbjahr.endsOn);
  const start = teachingStart[halbjahr.half];
  return addDays(
    halbjahr.startsOn,
    Math.floor((start + position * (1 - start)) * span),
  );
};

/** Diesen Anteil seiner Leistungen zeigt das laufende Halbjahr mindestens. */
const minimumShownShare = 0.5;

/**
 * Das Datum einer Leistung im laufenden Halbjahr, nur vor heute. Ist erst
 * wenig vom Halbjahr vergangen, rückt die erste Hälfte der Leistungen in die
 * vergangenen Tage, damit das Halbjahr nicht leer aussieht. Am ersten Tag des
 * Halbjahrs gibt es diese Tage noch nicht.
 */
const currentHalbjahrDate = (
  halbjahr: HalbjahrInput,
  position: number,
  today: string,
): string | null => {
  const regular = scheduledDate(halbjahr, position);
  if (regular < today) {
    return regular;
  }
  const elapsed = daysBetween(halbjahr.startsOn, today);
  const compressed = position / minimumShownShare;
  return elapsed > 0 && compressed < 1
    ? addDays(halbjahr.startsOn, Math.floor(compressed * elapsed))
    : null;
};

/** Schlüssel einer Leistung, wie ihn auch der Seed aus der Datenbank bildet. */
export const leistungKey = (
  leistung: Pick<
    SampleLeistung,
    'schoolYear' | 'half' | 'fach' | 'kind' | 'datum'
  >,
) =>
  [
    leistung.schoolYear,
    leistung.half,
    leistung.fach,
    leistung.kind,
    leistung.datum,
  ].join(':');

type HalbjahrContext = {
  readonly halbjahr: HalbjahrInput;
  /** Laufende Nummer ab dem ältesten Halbjahr, für die Entwicklung. */
  readonly index: number;
  readonly faecher: ReadonlyArray<SampleFach>;
};

/** Schrittweiten, mit denen Halbjahr und Fach durch `variation` laufen. */
const variationStride = { halbjahr: 5, fach: 3 } as const;

const variationAt = (
  halbjahrIndex: number,
  fachIndex: number,
  leistungIndex: number,
) =>
  variation[
    (halbjahrIndex * variationStride.halbjahr +
      fachIndex * variationStride.fach +
      leistungIndex) %
      variation.length
  ] ?? 0;

const gradedLeistungen = (
  { halbjahr, index, faecher: taken }: HalbjahrContext,
  today: string,
): ReadonlyArray<SampleLeistung> => {
  const system = notensystemForKlassenstufe(halbjahr.klassenstufe);
  const isCurrent = halbjahr.startsOn <= today && today <= halbjahr.endsOn;
  return taken.flatMap((fach, fachIndex) =>
    fach.schedule.flatMap((scheduled, leistungIndex) => {
      const datum = isCurrent
        ? currentHalbjahrDate(halbjahr, scheduled.position, today)
        : scheduledDate(halbjahr, scheduled.position);
      if (datum === null || datum >= today) {
        return [];
      }
      const oralBonus = scheduled.kind === 'muendlich' ? 1 : 0;
      const notenpunkte =
        fach.notenpunkte +
        fach.trend * index +
        oralBonus +
        variationAt(index, fachIndex, leistungIndex);
      const identity = {
        schoolYear: halbjahr.schoolYear,
        half: halbjahr.half,
        fach: fach.shortName,
        kind: scheduled.kind,
        datum,
      };
      return [
        {
          ...identity,
          key: leistungKey(identity),
          wert: valueFor(notenpunkte, system),
          gewicht: scheduled.gewicht ?? 1,
          notiz: scheduled.notiz ?? null,
          preparation: null,
        },
      ];
    }),
  );
};

const plannedLeistung = (
  planned: PlannedLeistung,
  today: string,
): SampleLeistung => {
  const datum = addDays(today, planned.offsetDays);
  const identity = {
    schoolYear: schoolYearForDate(datum),
    half: halbjahrForDate(datum),
    fach: planned.fach,
    kind: planned.kind,
    datum,
  };
  return {
    ...identity,
    key: leistungKey(identity),
    wert: null,
    gewicht: 1,
    notiz: planned.notiz,
    preparation: planned.preparation,
  };
};

/** Fällt eine benotete Leistung auf eine angekündigte, gilt die angekündigte. */
const uniqueByKey = (
  leistungen: ReadonlyArray<SampleLeistung>,
): ReadonlyArray<SampleLeistung> => {
  const keys = new Set<string>();
  return leistungen.filter((leistung) => {
    const isNew = !keys.has(leistung.key);
    keys.add(leistung.key);
    return isNew;
  });
};

/** Die zuletzt geschriebene Klausur bekommt eine abgehakte Vorbereitung. */
const withReviewedPreparation = (
  leistungen: ReadonlyArray<SampleLeistung>,
): ReadonlyArray<SampleLeistung> => {
  const latest = leistungen
    .filter((leistung) => leistung.kind === 'klausur' && leistung.wert !== null)
    .reduce<SampleLeistung | null>(
      (found, leistung) =>
        found === null || leistung.datum > found.datum ? leistung : found,
      null,
    );
  return leistungen.map((leistung) =>
    leistung === latest
      ? { ...leistung, preparation: reviewedPreparation }
      : leistung,
  );
};

/** Die belegten Fächer nach den Wechseln aller `years`. */
const faecherAfter = (
  years: ReadonlyArray<SampleSchoolYear>,
): ReadonlyArray<SampleFach> =>
  years.reduce<ReadonlyArray<SampleFach>>(
    (taken, year) => [
      ...taken.filter((fach) => !year.archivedFaecher.includes(fach.shortName)),
      ...year.addedFaecher,
    ],
    [],
  );

const planSchoolYears = (
  today: string,
  plannedHalbjahre: ReadonlySet<string>,
): ReadonlyArray<SampleSchoolYear> => {
  const firstStartYear =
    schoolYearStartYear(schoolYearForDate(today)) - pastSchoolYears;
  return klassenstufen.flatMap((klassenstufe, offset) => {
    const schoolYear = schoolYearFromStartYear(firstStartYear + offset);
    const halbjahre = ([1, 2] as const)
      .map((half) => ({
        klassenstufe,
        schoolYear,
        half,
        ...halbjahrDateRange(schoolYear, half),
      }))
      .filter(
        (halbjahr) =>
          offset < pastSchoolYears ||
          halbjahr.startsOn <= today ||
          plannedHalbjahre.has(halbjahrKey(schoolYear, halbjahr.half)),
      );
    const changes = fachChanges[offset];
    return halbjahre.length === 0 || changes === undefined
      ? []
      : [{ schoolYear, halbjahre, ...changes }];
  });
};

export const samplePlan = (today: string): SamplePlan => {
  const planned = plannedLeistungen.map((entry) =>
    plannedLeistung(entry, today),
  );
  const schoolYears = planSchoolYears(
    today,
    new Set(
      planned.map((leistung) =>
        halbjahrKey(leistung.schoolYear, leistung.half),
      ),
    ),
  );
  const graded = schoolYears.flatMap((year, offset) => {
    const taken = faecherAfter(schoolYears.slice(0, offset + 1));
    return year.halbjahre.flatMap((halbjahr) =>
      gradedLeistungen(
        { halbjahr, index: offset * 2 + halbjahr.half - 1, faecher: taken },
        today,
      ),
    );
  });
  const studyDays = plannedStudyDays.map((entry) => ({
    day: addDays(today, entry.offsetDays),
    fach: entry.fach,
    leistungKey:
      entry.forPlanned === null
        ? null
        : (planned[entry.forPlanned]?.key ?? null),
    minutes: entry.minutes,
    notiz: entry.notiz,
  }));
  return {
    schoolYears,
    leistungen: withReviewedPreparation(uniqueByKey([...planned, ...graded])),
    studyDays,
    preparationTemplates,
  };
};
