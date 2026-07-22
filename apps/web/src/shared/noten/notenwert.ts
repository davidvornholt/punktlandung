/**
 * Reine Notenmathematik. Zwei Systeme: "sechser" (1–6, kleiner ist besser)
 * und "punkte" (Notenpunkte 0–15, größer ist besser). Amtliche Umrechnung:
 * Punkte = 17 − 3 × Note.
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

/** Amtliche Umrechnungskonstanten: Punkte = 17 − 3 × Note. */
const umrechnungsBasis = 17;
const punkteProNotenstufe = 3;
const prozentBasis = 100;

/** Normalisiert einen nativen Wert auf die Punkteskala (0–15, dezimal). */
export const zuPunkten = (value: number, system: Notensystem): number =>
  system === 'punkte' ? value : umrechnungsBasis - punkteProNotenstufe * value;

/** Rechnet einen Punktewert (dezimal) in die Sechserskala um. */
export const zuSechser = (punkte: number): number =>
  (umrechnungsBasis - punkte) / punkteProNotenstufe;

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
