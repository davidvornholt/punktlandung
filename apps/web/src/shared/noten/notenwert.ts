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

export type Assessment = {
  readonly notenwert: number;
  readonly individualGewichtung: number;
  readonly leistungsart: Leistungsart;
  readonly wertungsbereich: Wertungsbereich;
};

export type Fachgewichtung = {
  /** Anteil schriftlicher Leistungen in Prozent; null = eine Gesamtliste. */
  readonly writtenShare: number | null;
  readonly kindWeights: Readonly<Record<Leistungsart, number>>;
};

/** Amtliche Umrechnungskonstanten: Punkte = 17 − 3 × Note. */
const conversionBase = 17;
const notenpunktePerNotenstufe = 3;
const percentBase = 100;
const minNotenpunkte = 0;
const maxNotenpunkte = 15;

/** Normalisiert einen nativen Wert auf die Punkteskala (0–15, dezimal). */
export const toNotenpunkte = (value: number, system: Notensystem): number => {
  const notenpunkte =
    system === 'punkte'
      ? value
      : conversionBase - notenpunktePerNotenstufe * value;
  return Math.min(maxNotenpunkte, Math.max(minNotenpunkte, notenpunkte));
};

/** Rechnet einen Punktewert (dezimal) in die Sechserskala um. */
export const toSechser = (notenpunkte: number): number =>
  (conversionBase - notenpunkte) / notenpunktePerNotenstufe;

const weightedAverage = (
  assessments: ReadonlyArray<Assessment>,
  fachGewichtung: Fachgewichtung,
): number | null => {
  let total = 0;
  let totalGewichtung = 0;
  for (const assessment of assessments) {
    const combinedGewichtung =
      assessment.individualGewichtung *
      fachGewichtung.kindWeights[assessment.leistungsart];
    total += assessment.notenwert * combinedGewichtung;
    totalGewichtung += combinedGewichtung;
  }
  return totalGewichtung === 0 ? null : total / totalGewichtung;
};

/**
 * Fachschnitt im nativen System: entweder eine gemeinsame gewichtete Liste
 * oder bereichsweise (schriftlich/mündlich) nach verkündetem Anteil. Fehlt
 * ein Bereich vollständig, zählt der vorhandene allein.
 */
export const fachAverage = (
  assessments: ReadonlyArray<Assessment>,
  fachGewichtung: Fachgewichtung,
): number | null => {
  if (fachGewichtung.writtenShare === null) {
    return weightedAverage(assessments, fachGewichtung);
  }
  const schriftlichAverage = weightedAverage(
    assessments.filter(
      (assessment) => assessment.wertungsbereich === 'schriftlich',
    ),
    fachGewichtung,
  );
  const muendlichAverage = weightedAverage(
    assessments.filter(
      (assessment) => assessment.wertungsbereich === 'muendlich',
    ),
    fachGewichtung,
  );
  if (schriftlichAverage === null) {
    return muendlichAverage;
  }
  if (muendlichAverage === null) {
    return schriftlichAverage;
  }
  const share = fachGewichtung.writtenShare / percentBase;
  return schriftlichAverage * share + muendlichAverage * (1 - share);
};
