import type {
  JahresvorschauRow,
  Zeugnis,
  ZeugnisRow,
} from '../services/zeugnis-service.ts';

/** Erfundene Zeugnisse für die Stories dieser Seite. */

export const today = '2026-11-26';

/** What the service sends for one Fach, written out: these stories calculate nothing. */
type Sample = {
  readonly name: string;
  readonly kuerzel: string;
  readonly schnitt: number | null;
  readonly halbjahresnote: number | null;
  readonly anzeige: string | null;
  readonly noten: number;
  readonly archived?: boolean;
};

const row = (sample: Sample): ZeugnisRow => ({
  fachId: sample.name.toLowerCase(),
  fachName: sample.name,
  fachKuerzel: sample.kuerzel,
  archived: sample.archived ?? false,
  schnitt: sample.schnitt,
  halbjahresnote: sample.halbjahresnote,
  anzeige: sample.anzeige,
  anzahlNoten: sample.noten,
});

const ohneNote = (name: string, kuerzel: string): Sample => ({
  name,
  kuerzel,
  schnitt: null,
  halbjahresnote: null,
  anzeige: null,
  noten: 0,
});

/*
 * Kursstufe. Mathematik liegt genau auf einer Grenze und wird aufgerundet,
 * Geschichte so nah an der Marke, dass die Lupe keinen Pfeil zeichnet, Sport
 * hat noch keine Note und Latein ist archiviert.
 */
const kursstufe = {
  faecher: [
    {
      name: 'Deutsch',
      kuerzel: 'D',
      schnitt: 10.8,
      halbjahresnote: 11,
      anzeige: '11 P.',
      noten: 3,
    },
    {
      name: 'Mathematik',
      kuerzel: 'M',
      schnitt: 12.5,
      halbjahresnote: 13,
      anzeige: '13 P.',
      noten: 2,
    },
    {
      name: 'Englisch',
      kuerzel: 'E',
      schnitt: 12,
      halbjahresnote: 12,
      anzeige: '12 P.',
      noten: 2,
    },
    {
      name: 'Physik',
      kuerzel: 'Ph',
      schnitt: 12.333_333,
      halbjahresnote: 12,
      anzeige: '12 P.',
      noten: 3,
    },
    {
      name: 'Geschichte',
      kuerzel: 'G',
      schnitt: 8.9,
      halbjahresnote: 9,
      anzeige: '9 P.',
      noten: 2,
    },
    ohneNote('Sport', 'Sp'),
    {
      name: 'Latein',
      kuerzel: 'Latein',
      schnitt: 9.25,
      halbjahresnote: 9,
      anzeige: '9 P.',
      noten: 1,
      archived: true,
    },
  ],
  schnitt: 11,
} as const;

/*
 * Klasse 10, zweites Halbjahr: Viertelnoten und eine Jahresvorschau.
 * Mathematik liegt genau zwischen 1-2 und 2+ und bekommt die schlechtere Note.
 * Musik hat eine Note in einem Wertungsbereich ohne Anteil, die nicht zählt.
 */
const mittelstufe = {
  faecher: [
    {
      name: 'Deutsch',
      kuerzel: 'D',
      schnitt: 2.3,
      halbjahresnote: 2.25,
      anzeige: '2-',
      noten: 4,
    },
    {
      name: 'Mathematik',
      kuerzel: 'M',
      schnitt: 1.625,
      halbjahresnote: 1.75,
      anzeige: '2+',
      noten: 3,
    },
    {
      name: 'Englisch',
      kuerzel: 'E',
      schnitt: 3,
      halbjahresnote: 3,
      anzeige: '3',
      noten: 3,
    },
    {
      name: 'Biologie',
      kuerzel: 'Bio',
      schnitt: 2.6,
      halbjahresnote: 2.5,
      anzeige: '2-3',
      noten: 2,
    },
    ohneNote('Kunst', 'Ku'),
    { ...ohneNote('Musik', 'Mu'), noten: 1 },
    {
      name: 'Latein',
      kuerzel: 'L',
      schnitt: 3.9,
      halbjahresnote: 4,
      anzeige: '4',
      noten: 2,
      archived: true,
    },
  ],
  schnitt: 2.7,
  jahr: [
    { name: 'Deutsch', note: 2, grenzfall: false },
    { name: 'Mathematik', note: 2, grenzfall: true },
    { name: 'Englisch', note: 3, grenzfall: false },
    { name: 'Biologie', note: 3, grenzfall: true },
    { name: 'Latein', note: 4, grenzfall: false, archived: true },
  ],
} as const;

const jahresRow = (sample: {
  readonly name: string;
  readonly note: number;
  readonly grenzfall: boolean;
  readonly archived?: boolean;
}): JahresvorschauRow => ({
  fachId: sample.name.toLowerCase(),
  fachName: sample.name,
  archived: sample.archived ?? false,
  note: sample.note,
  grenzfall: sample.grenzfall,
});

export const punkte: Zeugnis = {
  termId: 'j1-1',
  label: 'J1.1',
  schoolYear: '2026/27',
  system: 'punkte',
  gesamtschnitt: '11 P.',
  gesamtschnittWert: kursstufe.schnitt,
  zeilen: kursstufe.faecher.map(row),
  jahresvorschau: null,
};

export const sechser: Zeugnis = {
  termId: 'k10-2',
  label: '10.2',
  schoolYear: '2025/26',
  system: 'sechser',
  gesamtschnitt: '2,7',
  gesamtschnittWert: mittelstufe.schnitt,
  zeilen: mittelstufe.faecher.map(row),
  jahresvorschau: mittelstufe.jahr.map(jahresRow),
};

export const ohneNoten: Zeugnis = {
  ...punkte,
  gesamtschnitt: null,
  gesamtschnittWert: null,
  zeilen: [ohneNote('Deutsch', 'D'), ohneNote('Mathematik', 'M')].map(row),
};

export const ohneFaecher: Zeugnis = { ...ohneNoten, zeilen: [] };

/*
 * Zwölf Fächer, die alle auf 11 P. landen: die Scheiben stapeln sich über
 * einer Marke, und die Tabelle hat ein volles Dutzend Zeilen.
 */
const dutzend = {
  faecher: [
    { name: 'Deutsch', schnitt: 10.5 },
    { name: 'Mathematik', schnitt: 10.6 },
    { name: 'Englisch', schnitt: 10.75 },
    { name: 'Französisch', schnitt: 10.8 },
    { name: 'Physik', schnitt: 10.9 },
    { name: 'Chemie', schnitt: 11 },
    { name: 'Biologie', schnitt: 11 },
    { name: 'Geschichte', schnitt: 11.1 },
    { name: 'Gemeinschaftskunde', schnitt: 11.2 },
    { name: 'Religion', schnitt: 11.25 },
    { name: 'Bildende Kunst', schnitt: 11.33 },
    { name: 'Sport', schnitt: 11.4 },
  ],
  halbjahresnote: 11,
  noten: 2,
} as const;

export const zwoelfAufEinerNote: Zeugnis = {
  ...punkte,
  zeilen: dutzend.faecher.map((fach) =>
    row({
      ...fach,
      kuerzel: fach.name.slice(0, 2),
      halbjahresnote: dutzend.halbjahresnote,
      anzeige: '11 P.',
      noten: dutzend.noten,
    }),
  ),
};

/* Die Enden beider Skalen: jenseits davon gibt es keinen Stab, den die Lupe zeigen könnte. */
const enden = {
  punkte: [
    { name: 'Deutsch', schnitt: 15, halbjahresnote: 15, anzeige: '15 P.' },
    { name: 'Mathematik', schnitt: 14.6, halbjahresnote: 15, anzeige: '15 P.' },
    { name: 'Englisch', schnitt: 0.4, halbjahresnote: 0, anzeige: '0 P.' },
    { name: 'Physik', schnitt: 0, halbjahresnote: 0, anzeige: '0 P.' },
  ],
  punkteSchnitt: 7.5,
  sechser: [
    { name: 'Deutsch', schnitt: 1, halbjahresnote: 1, anzeige: '1' },
    { name: 'Mathematik', schnitt: 1.1, halbjahresnote: 1, anzeige: '1' },
    { name: 'Englisch', schnitt: 5.9, halbjahresnote: 6, anzeige: '6' },
    { name: 'Physik', schnitt: 6, halbjahresnote: 6, anzeige: '6' },
  ],
  sechserSchnitt: 3.5,
  noten: 2,
} as const;

type Ende = (typeof enden.punkte)[number] | (typeof enden.sechser)[number];

const endRow = (ende: Ende): ZeugnisRow =>
  row({ ...ende, kuerzel: ende.name.slice(0, 1), noten: enden.noten });

export const punkteEnden: Zeugnis = {
  ...punkte,
  gesamtschnitt: '7,5 P.',
  gesamtschnittWert: enden.punkteSchnitt,
  zeilen: enden.punkte.map(endRow),
};

export const sechserEnden: Zeugnis = {
  ...sechser,
  gesamtschnitt: '3,5',
  gesamtschnittWert: enden.sechserSchnitt,
  zeilen: enden.sechser.map(endRow),
  jahresvorschau: null,
};
