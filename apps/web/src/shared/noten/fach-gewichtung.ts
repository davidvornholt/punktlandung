import type { Fachgewichtung } from './notenwert.ts';

type GewichtsSpalten = {
  readonly writtenShare: number | null;
  readonly klausurWeight: string;
  readonly testWeight: string;
  readonly muendlichWeight: string;
  readonly gfsWeight: string;
  readonly sonstigeWeight: string;
};

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
