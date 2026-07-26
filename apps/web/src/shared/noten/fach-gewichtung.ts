import type { Fachgewichtung } from './notenwert.ts';

type FachgewichtungColumns = {
  readonly schriftlichShare: number | null;
  readonly klausurGewichtung: string;
  readonly testGewichtung: string;
  readonly muendlichGewichtung: string;
  readonly gfsGewichtung: string;
  readonly sonstigeGewichtung: string;
};

/**
 * Übersetzt die numeric-Spalten (Strings) einer Fachzeile in die
 * Fachgewichtung der Notenmathematik.
 */
export const toFachgewichtung = (
  fach: FachgewichtungColumns,
): Fachgewichtung => ({
  schriftlichShare: fach.schriftlichShare,
  leistungsartGewichtungen: {
    klausur: Number(fach.klausurGewichtung),
    test: Number(fach.testGewichtung),
    muendlich: Number(fach.muendlichGewichtung),
    gfs: Number(fach.gfsGewichtung),
    sonstige: Number(fach.sonstigeGewichtung),
  },
});
