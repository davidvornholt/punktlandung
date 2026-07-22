import type {
  Leistungsart,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';

export const leistungsartLabel: Readonly<Record<Leistungsart, string>> = {
  klausur: 'Klausur',
  test: 'Test',
  muendlich: 'Mündlich',
  gfs: 'GFS',
  sonstige: 'Sonstige',
};

export const bereichLabel: Readonly<Record<Wertungsbereich, string>> = {
  schriftlich: 'schriftlich',
  muendlich: 'mündlich',
};
