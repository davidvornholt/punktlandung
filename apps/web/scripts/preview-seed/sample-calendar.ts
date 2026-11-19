import type { PlanbareLeistungsart } from '#/shared/noten/notenwert.ts';
import { faecher } from './sample-faecher.ts';

/** Was rund um den Seed-Tag ansteht, in Tagen ab heute. */

export type PlannedLeistung = {
  /** Fachkürzel. Jedes hier genutzte Fach ist in allen Schuljahren belegt. */
  readonly fach: string;
  readonly kind: PlanbareLeistungsart;
  /** Negativ heißt: Termin vorbei, Note fehlt noch. */
  readonly offsetDays: number;
  readonly notiz: string | null;
};

export const plannedLeistungen: ReadonlyArray<PlannedLeistung> = [
  {
    fach: faecher.history.shortName,
    kind: 'test',
    offsetDays: -3,
    notiz: 'Note noch nicht zurück',
  },
  {
    fach: faecher.english.shortName,
    kind: 'test',
    offsetDays: 2,
    notiz: 'Vokabeln',
  },
  {
    fach: faecher.math.shortName,
    kind: 'klausur',
    offsetDays: 5,
    notiz: 'Analysis',
  },
  {
    fach: faecher.biology.shortName,
    kind: 'gfs',
    offsetDays: 9,
    notiz: 'Referat: Genetik',
  },
  {
    fach: faecher.german.shortName,
    kind: 'klausur',
    offsetDays: 16,
    notiz: 'Textgebundene Erörterung',
  },
  {
    fach: faecher.physics.shortName,
    kind: 'test',
    offsetDays: 24,
    notiz: null,
  },
];
