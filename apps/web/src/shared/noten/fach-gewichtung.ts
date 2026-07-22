import type { subject } from '#/shared/db/schema.ts';
import type { Fachgewichtung } from './notenwert.ts';

type GewichtsSpalten = Pick<
  typeof subject.$inferSelect,
  | 'writtenShare'
  | 'klausurWeight'
  | 'testWeight'
  | 'muendlichWeight'
  | 'gfsWeight'
  | 'sonstigeWeight'
>;

/**
 * Übersetzt die numeric-Spalten (Strings) einer Fachzeile in die
 * Fachgewichtung der Notenmathematik.
 */
export const zuFachgewichtung = (fach: GewichtsSpalten): Fachgewichtung => ({
  writtenShare: fach.writtenShare,
  kindWeights: {
    klausur: Number(fach.klausurWeight),
    test: Number(fach.testWeight),
    muendlich: Number(fach.muendlichWeight),
    gfs: Number(fach.gfsWeight),
    sonstige: Number(fach.sonstigeWeight),
  },
});
