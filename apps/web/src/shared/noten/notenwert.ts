/**
 * Reine Notenmathematik. Zwei Systeme: "sechser" (1–6, kleiner ist besser)
 * und "punkte" (Notenpunkte 0–15, größer ist besser).
 */

export type Notensystem = 'sechser' | 'punkte';

export type Leistungsart =
  | 'klausur'
  | 'test'
  | 'muendlich'
  | 'gfs'
  | 'sonstige';

export type Wertungsbereich = 'schriftlich' | 'muendlich';

export type Leistung = {
  readonly value: number;
  readonly weight: number;
  readonly kind: Leistungsart;
  readonly area: Wertungsbereich;
};

export type Fachgewichtung = {
  /** Anteil schriftlicher Leistungen in Prozent; null = eine Gesamtliste. */
  readonly writtenShare: number | null;
  readonly kindWeights: Readonly<Record<Leistungsart, number>>;
};

const prozentBasis = 100;
const punkteMin = 0;
const punkteMax = 15;

type Umrechnungsanker = {
  readonly eingabe: number;
  readonly ausgabe: number;
};

/**
 * Baden-Württemberg vergibt ganze Notenpunkte nach Notentendenz. Die
 * Dezimalwerte links sind die Viertelnoten, mit denen die App diese Tendenzen
 * im Sechsersystem erfasst; sie selbst sind keine amtliche Umrechnungstabelle.
 */
const sechserZuPunkteAnker: ReadonlyArray<Umrechnungsanker> = [
  { eingabe: 0.75, ausgabe: 15 },
  { eingabe: 1, ausgabe: 14 },
  { eingabe: 1.25, ausgabe: 13 },
  { eingabe: 1.75, ausgabe: 12 },
  { eingabe: 2, ausgabe: 11 },
  { eingabe: 2.25, ausgabe: 10 },
  { eingabe: 2.75, ausgabe: 9 },
  { eingabe: 3, ausgabe: 8 },
  { eingabe: 3.25, ausgabe: 7 },
  { eingabe: 3.75, ausgabe: 6 },
  { eingabe: 4, ausgabe: 5 },
  { eingabe: 4.25, ausgabe: 4 },
  { eingabe: 4.75, ausgabe: 3 },
  { eingabe: 5, ausgabe: 2 },
  { eingabe: 5.25, ausgabe: 1 },
  { eingabe: 6, ausgabe: 0 },
];

const punkteZuSechserAnker: ReadonlyArray<Umrechnungsanker> = [
  ...sechserZuPunkteAnker,
]
  .reverse()
  .map(({ eingabe, ausgabe }) => ({ eingabe: ausgabe, ausgabe: eingabe }));

const interpoliere = (
  value: number,
  anker: ReadonlyArray<Umrechnungsanker>,
): number => {
  if (Number.isNaN(value)) {
    return value;
  }
  const [erster] = anker;
  const letzter = anker.at(-1);
  if (erster === undefined || letzter === undefined) {
    return value;
  }
  if (value <= erster.eingabe) {
    return erster.ausgabe;
  }
  for (let index = 1; index < anker.length; index += 1) {
    const links = anker[index - 1];
    const rechts = anker[index];
    if (
      links !== undefined &&
      rechts !== undefined &&
      value <= rechts.eingabe
    ) {
      const position =
        (value - links.eingabe) / (rechts.eingabe - links.eingabe);
      return links.ausgabe + position * (rechts.ausgabe - links.ausgabe);
    }
  }
  return letzter.ausgabe;
};

/** Normalisiert einen nativen Wert auf die Punkteskala (0–15, dezimal). */
export const zuPunkten = (value: number, system: Notensystem): number =>
  system === 'punkte'
    ? Math.min(punkteMax, Math.max(punkteMin, value))
    : interpoliere(value, sechserZuPunkteAnker);

/** Rechnet einen Punktewert (dezimal) in die Sechserskala um. */
export const zuSechser = (punkte: number): number =>
  interpoliere(punkte, punkteZuSechserAnker);

const gewichtetesMittel = (
  leistungen: ReadonlyArray<Leistung>,
  gewichtung: Fachgewichtung,
): number | null => {
  let summe = 0;
  let gewichte = 0;
  for (const l of leistungen) {
    const gewicht = l.weight * gewichtung.kindWeights[l.kind];
    summe += l.value * gewicht;
    gewichte += gewicht;
  }
  return gewichte === 0 ? null : summe / gewichte;
};

/**
 * Fachschnitt im nativen System: entweder eine gemeinsame gewichtete Liste
 * oder bereichsweise (schriftlich/mündlich) nach verkündetem Anteil. Fehlt
 * ein Bereich vollständig, zählt der vorhandene allein.
 */
export const fachschnitt = (
  leistungen: ReadonlyArray<Leistung>,
  gewichtung: Fachgewichtung,
): number | null => {
  if (gewichtung.writtenShare === null) {
    return gewichtetesMittel(leistungen, gewichtung);
  }
  const schriftlich = gewichtetesMittel(
    leistungen.filter((l) => l.area === 'schriftlich'),
    gewichtung,
  );
  const muendlich = gewichtetesMittel(
    leistungen.filter((l) => l.area === 'muendlich'),
    gewichtung,
  );
  if (schriftlich === null) {
    return muendlich;
  }
  if (muendlich === null) {
    return schriftlich;
  }
  const anteil = gewichtung.writtenShare / prozentBasis;
  return schriftlich * anteil + muendlich * (1 - anteil);
};
