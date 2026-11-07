import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung, Leistungsart } from '#/shared/noten/notenwert.ts';

/** Die erfundene Schullaufbahn der Preview: Fächer, Gewichtungen und Termine. */

export type ScheduledLeistung = {
  readonly kind: Leistungsart;
  /** Lage im Unterricht des Halbjahrs: 0 = Beginn, 1 = Ende. */
  readonly position: number;
  readonly gewicht?: number;
  readonly notiz?: string;
};

export type SampleFach = {
  readonly name: string;
  readonly shortName: string;
  readonly gewichtung: Fachgewichtung;
  /** Leistungsstand in Notenpunkten im ältesten Halbjahr. */
  readonly notenpunkte: number;
  /** Entwicklung in Notenpunkten je Halbjahr. */
  readonly trend: number;
  /** Die Leistungen eines Halbjahrs. */
  readonly schedule: ReadonlyArray<ScheduledLeistung>;
};

const halfWeight = 0.5;

const artgewichtung = (
  gewicht: number,
  sammlung: 'einzeln' | 'gesammelt' = 'einzeln',
) => ({ gewicht, sammlung }) as const;

const languageGewichtung: Fachgewichtung = {
  verhaeltnis: { schriftlich: 60, muendlich: 40 },
  arten: {
    klausur: artgewichtung(1),
    gfs: artgewichtung(1),
    test: artgewichtung(1, 'gesammelt'),
    muendlich: artgewichtung(1),
    sonstige: artgewichtung(halfWeight),
  },
};

const mathArten: Fachgewichtung['arten'] = {
  klausur: artgewichtung(2),
  gfs: artgewichtung(1),
  test: artgewichtung(2, 'gesammelt'),
  muendlich: artgewichtung(1),
  sonstige: artgewichtung(1),
};

const scienceGewichtung: Fachgewichtung = {
  verhaeltnis: { schriftlich: 50, muendlich: 50 },
  arten: {
    klausur: artgewichtung(1),
    gfs: artgewichtung(1),
    test: artgewichtung(halfWeight),
    muendlich: artgewichtung(1),
    sonstige: artgewichtung(1),
  },
};

export const faecher = {
  german: {
    name: 'Deutsch',
    shortName: 'D',
    gewichtung: languageGewichtung,
    notenpunkte: 10,
    trend: 0.3,
    schedule: [
      { kind: 'klausur', position: 0.3, notiz: 'Erörterung' },
      { kind: 'sonstige', position: 0.45, notiz: 'Lesetagebuch' },
      { kind: 'klausur', position: 0.75, notiz: 'Gedichtanalyse' },
      { kind: 'muendlich', position: 0.9 },
    ],
  },
  math: {
    name: 'Mathematik',
    shortName: 'M',
    gewichtung: {
      verhaeltnis: { schriftlich: 2, muendlich: 1 },
      arten: mathArten,
    },
    notenpunkte: 8,
    trend: 0.8,
    schedule: [
      { kind: 'test', position: 0.2 },
      { kind: 'klausur', position: 0.35, notiz: 'Funktionen' },
      { kind: 'test', position: 0.55, gewicht: halfWeight, notiz: 'Kurztest' },
      { kind: 'klausur', position: 0.8, notiz: 'Wahrscheinlichkeit' },
      { kind: 'muendlich', position: 0.9 },
    ],
  },
  english: {
    name: 'Englisch',
    shortName: 'E',
    gewichtung: standardgewichtung,
    notenpunkte: 12,
    trend: 0,
    schedule: [
      { kind: 'test', position: 0.15, notiz: 'Vokabeln' },
      { kind: 'klausur', position: 0.4, notiz: 'Text comprehension' },
      { kind: 'muendlich', position: 0.6, notiz: 'Präsentation' },
      { kind: 'klausur', position: 0.8 },
      { kind: 'muendlich', position: 0.92 },
    ],
  },
  french: {
    name: 'Französisch',
    shortName: 'F',
    gewichtung: languageGewichtung,
    notenpunkte: 7,
    trend: -0.6,
    schedule: [
      { kind: 'test', position: 0.25, notiz: 'Grammatik' },
      { kind: 'klausur', position: 0.45 },
      { kind: 'klausur', position: 0.8 },
      { kind: 'muendlich', position: 0.9 },
    ],
  },
  physics: {
    name: 'Physik',
    shortName: 'Ph',
    gewichtung: scienceGewichtung,
    notenpunkte: 9,
    trend: 0.4,
    schedule: [
      { kind: 'test', position: 0.25 },
      { kind: 'klausur', position: 0.5, notiz: 'Mechanik' },
      { kind: 'test', position: 0.7 },
      { kind: 'muendlich', position: 0.9 },
    ],
  },
  biology: {
    name: 'Biologie',
    shortName: 'Bio',
    gewichtung: standardgewichtung,
    notenpunkte: 11,
    trend: 0.2,
    schedule: [
      { kind: 'klausur', position: 0.4, notiz: 'Zellbiologie' },
      { kind: 'gfs', position: 0.6, notiz: 'Referat: Ökosystem Wald' },
      { kind: 'muendlich', position: 0.9 },
    ],
  },
  history: {
    name: 'Geschichte',
    shortName: 'G',
    gewichtung: {
      verhaeltnis: { schriftlich: 40, muendlich: 60 },
      arten: standardgewichtung.arten,
    },
    notenpunkte: 10,
    trend: -0.2,
    schedule: [
      { kind: 'test', position: 0.3 },
      { kind: 'klausur', position: 0.65, notiz: 'Weimarer Republik' },
      { kind: 'muendlich', position: 0.88 },
    ],
  },
  chemistry: {
    name: 'Chemie',
    shortName: 'Ch',
    gewichtung: scienceGewichtung,
    notenpunkte: 8,
    trend: 0.5,
    schedule: [
      { kind: 'test', position: 0.3 },
      { kind: 'klausur', position: 0.6, notiz: 'Säuren und Basen' },
      { kind: 'muendlich', position: 0.9 },
    ],
  },
  computerScience: {
    name: 'Informatik',
    shortName: 'Inf',
    gewichtung: standardgewichtung,
    notenpunkte: 12,
    trend: 0.5,
    schedule: [
      { kind: 'klausur', position: 0.45, notiz: 'Algorithmen' },
      { kind: 'gfs', position: 0.7, notiz: 'Projekt: Wetterstation' },
      { kind: 'muendlich', position: 0.9 },
    ],
  },
} as const satisfies Record<string, SampleFach>;

/** In der Kursstufe zählt Mathe halb schriftlich, halb mündlich. */
export const kursstufeMath: SampleFach = {
  ...faecher.math,
  gewichtung: {
    verhaeltnis: { schriftlich: 1, muendlich: 1 },
    arten: mathArten,
  },
};

/** Feste Abweichungen vom Leistungsstand, damit der Verlauf lebendig wirkt. */
export const variation: ReadonlyArray<number> = [
  0, 2, -1, 1, -2, 1, 0, -1, 2, -1, 1, -2, 0, 2, -1, 0, 1,
];
