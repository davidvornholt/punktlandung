import type { PreparationTemplateInput } from '#/features/noten/schemas/note-schema.ts';
import type { PlanbareLeistungsart } from '#/shared/noten/notenwert.ts';
import { faecher } from './sample-faecher.ts';

/** Was rund um den Seed-Tag ansteht und gelernt wurde, in Tagen ab heute. */

export type PlannedLeistung = {
  /** Fachkürzel. Jedes hier genutzte Fach ist in allen Schuljahren belegt. */
  readonly fach: string;
  readonly kind: PlanbareLeistungsart;
  /** Negativ heißt: Termin vorbei, Note fehlt noch. */
  readonly offsetDays: number;
  readonly notiz: string | null;
  readonly preparation: string | null;
};

const mathPreparation = [
  '## Themen',
  '',
  '- [x] Ableitungsregeln',
  '- [x] Kurvendiskussion',
  '- [ ] Extremwertprobleme',
  '- [ ] Integral als Flächeninhalt',
  '',
  '## Notizen',
  '',
  'Altklausur rechnen, Formelsammlung einpacken.',
  '',
].join('\n');

const gfsPreparation = [
  '## Gliederung',
  '',
  '- [x] Thema abgesprochen',
  '- [x] Quellen gesammelt',
  '- [ ] Folien',
  '- [ ] Probevortrag',
  '',
].join('\n');

/** Die Vorbereitung der zuletzt geschriebenen Klausur, ganz abgehakt. */
export const reviewedPreparation = [
  '## Themen',
  '',
  '- [x] Hefteintrag durchgearbeitet',
  '- [x] Übungsaufgaben aus dem Buch',
  '- [x] Fachbegriffe gelernt',
  '',
  '## Notizen',
  '',
  'Gut vorbereitet, nur die Zeit war knapp.',
  '',
].join('\n');

export const plannedLeistungen: ReadonlyArray<PlannedLeistung> = [
  {
    fach: faecher.history.shortName,
    kind: 'test',
    offsetDays: -3,
    notiz: 'Note noch nicht zurück',
    preparation: null,
  },
  {
    fach: faecher.english.shortName,
    kind: 'test',
    offsetDays: 2,
    notiz: 'Vokabeln',
    preparation: null,
  },
  {
    fach: faecher.math.shortName,
    kind: 'klausur',
    offsetDays: 5,
    notiz: 'Analysis',
    preparation: mathPreparation,
  },
  {
    fach: faecher.biology.shortName,
    kind: 'gfs',
    offsetDays: 9,
    notiz: 'Referat: Genetik',
    preparation: gfsPreparation,
  },
  {
    fach: faecher.german.shortName,
    kind: 'klausur',
    offsetDays: 16,
    notiz: 'Textgebundene Erörterung',
    preparation: null,
  },
  {
    fach: faecher.physics.shortName,
    kind: 'test',
    offsetDays: 24,
    notiz: null,
    preparation: null,
  },
];

export type PlannedStudyDay = {
  readonly offsetDays: number;
  /** Fachkürzel; null ist ein allgemeiner Lerntag. */
  readonly fach: string | null;
  /** Index in `plannedLeistungen`, wenn der Tag dieser Leistung galt. */
  readonly forPlanned: number | null;
  readonly minutes: number | null;
  readonly notiz: string | null;
};

const englishTest = 1;
const mathKlausur = 2;
const biologyGfs = 3;

/** Die letzten drei Wochen mit einer Serie bis heute. */
export const plannedStudyDays: ReadonlyArray<PlannedStudyDay> = [
  {
    offsetDays: 0,
    fach: faecher.english.shortName,
    forPlanned: englishTest,
    minutes: 20,
    notiz: null,
  },
  {
    offsetDays: -1,
    fach: faecher.math.shortName,
    forPlanned: mathKlausur,
    minutes: 45,
    notiz: null,
  },
  {
    offsetDays: -1,
    fach: faecher.english.shortName,
    forPlanned: englishTest,
    minutes: 15,
    notiz: null,
  },
  {
    offsetDays: -2,
    fach: faecher.math.shortName,
    forPlanned: mathKlausur,
    minutes: 60,
    notiz: 'Altklausur gerechnet',
  },
  {
    offsetDays: -3,
    fach: null,
    forPlanned: null,
    minutes: 30,
    notiz: 'Hausaufgaben nachgeholt',
  },
  {
    offsetDays: -4,
    fach: faecher.math.shortName,
    forPlanned: mathKlausur,
    minutes: 40,
    notiz: null,
  },
  {
    offsetDays: -5,
    fach: faecher.biology.shortName,
    forPlanned: biologyGfs,
    minutes: 90,
    notiz: 'Quellen für das Referat',
  },
  {
    offsetDays: -6,
    fach: faecher.math.shortName,
    forPlanned: mathKlausur,
    minutes: null,
    notiz: null,
  },
  {
    offsetDays: -8,
    fach: faecher.german.shortName,
    forPlanned: null,
    minutes: 30,
    notiz: null,
  },
  {
    offsetDays: -10,
    fach: faecher.physics.shortName,
    forPlanned: null,
    minutes: 25,
    notiz: null,
  },
  { offsetDays: -11, fach: null, forPlanned: null, minutes: 60, notiz: null },
  {
    offsetDays: -13,
    fach: faecher.biology.shortName,
    forPlanned: biologyGfs,
    minutes: 45,
    notiz: null,
  },
  {
    offsetDays: -15,
    fach: faecher.english.shortName,
    forPlanned: null,
    minutes: 20,
    notiz: null,
  },
  {
    offsetDays: -18,
    fach: faecher.math.shortName,
    forPlanned: null,
    minutes: 50,
    notiz: null,
  },
  {
    offsetDays: -20,
    fach: faecher.german.shortName,
    forPlanned: null,
    minutes: 35,
    notiz: null,
  },
];

/** Eigene Vorlagen für Klausur und GFS; der Test behält die eingebaute. */
export const preparationTemplates: ReadonlyArray<PreparationTemplateInput> = [
  {
    kind: 'klausur',
    content: [
      '## Themen',
      '',
      '- [ ] Erstes Thema',
      '',
      '## Material',
      '',
      '- Hefteintrag',
      '- Buchseiten',
      '',
      '## Fragen an die Lehrkraft',
      '',
    ].join('\n'),
  },
  {
    kind: 'gfs',
    content: [
      '## Gliederung',
      '',
      '- [ ] Thema abgesprochen',
      '- [ ] Quellen gesammelt',
      '- [ ] Folien',
      '- [ ] Probevortrag',
      '',
    ].join('\n'),
  },
];
