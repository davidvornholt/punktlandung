import type { Leistungsart, Wertungsbereich } from './notenwert.ts';

/**
 * Reihenfolge für Anzeige und Erklärtexte: jede Art, die üblicherweise einer
 * anderen folgt, steht direkt hinter ihrem Vorbild. `leistungsarten` bleibt
 * davon unberührt — dort zählt die Reihenfolge des grade_kind-Enums.
 */
export const leistungsartReihenfolge: ReadonlyArray<Leistungsart> = [
  'klausur',
  'gfs',
  'test',
  'muendlich',
  'sonstige',
];

export const leistungsartLabel: Readonly<Record<Leistungsart, string>> = {
  klausur: 'Klausur',
  gfs: 'GFS',
  test: 'Test',
  muendlich: 'Mündlich',
  sonstige: 'Sonstige',
};

/** Mehrzahl für Fließtext: "alle Tests zusammen zählen wie eine Klausur". */
export const leistungsartPlural: Readonly<Record<Leistungsart, string>> = {
  klausur: 'Klausuren',
  gfs: 'GFS',
  test: 'Tests',
  muendlich: 'mündliche Noten',
  sonstige: 'sonstige Noten',
};

export const bereichLabel: Readonly<Record<Wertungsbereich, string>> = {
  schriftlich: 'schriftlich',
  muendlich: 'mündlich',
};

/**
 * Der Bereich als Überschrift über den Leistungsarten, die ihn besetzen. Der
 * mündliche Bereich heißt dort nach beiden Arten, damit die Überschrift nicht
 * wie die Leistungsart „Mündlich“ direkt darunter aussieht.
 */
export const bereichTitel: Readonly<Record<Wertungsbereich, string>> = {
  schriftlich: 'Schriftlich',
  muendlich: 'Mündlich und Sonstige',
};
