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

const percentBase = 100;
const minNotenpunkte = 0;
const maxNotenpunkte = 15;

type ConversionAnchor = {
  readonly input: number;
  readonly output: number;
};

/**
 * Baden-Württemberg vergibt ganze Notenpunkte nach Notentendenz. Die
 * Dezimalwerte links sind die Viertelnoten, mit denen die App diese Tendenzen
 * im Sechsersystem erfasst; sie selbst sind keine amtliche Umrechnungstabelle.
 */
const sechserToNotenpunkteAnchors: ReadonlyArray<ConversionAnchor> = [
  { input: 0.75, output: 15 },
  { input: 1, output: 14 },
  { input: 1.25, output: 13 },
  { input: 1.75, output: 12 },
  { input: 2, output: 11 },
  { input: 2.25, output: 10 },
  { input: 2.75, output: 9 },
  { input: 3, output: 8 },
  { input: 3.25, output: 7 },
  { input: 3.75, output: 6 },
  { input: 4, output: 5 },
  { input: 4.25, output: 4 },
  { input: 4.75, output: 3 },
  { input: 5, output: 2 },
  { input: 5.25, output: 1 },
  { input: 6, output: 0 },
];

const notenpunkteToSechserAnchors: ReadonlyArray<ConversionAnchor> = [
  ...sechserToNotenpunkteAnchors,
]
  .reverse()
  .map(({ input, output }) => ({ input: output, output: input }));

const interpolate = (
  value: number,
  anchors: ReadonlyArray<ConversionAnchor>,
): number => {
  if (Number.isNaN(value)) {
    return value;
  }
  const [first] = anchors;
  const last = anchors.at(-1);
  if (first === undefined || last === undefined) {
    return value;
  }
  if (value <= first.input) {
    return first.output;
  }
  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];
    if (left !== undefined && right !== undefined && value <= right.input) {
      const position = (value - left.input) / (right.input - left.input);
      return left.output + position * (right.output - left.output);
    }
  }
  return last.output;
};

/** Normalisiert einen nativen Wert auf die Punkteskala (0–15, dezimal). */
export const toNotenpunkte = (value: number, system: Notensystem): number =>
  system === 'punkte'
    ? Math.min(maxNotenpunkte, Math.max(minNotenpunkte, value))
    : interpolate(value, sechserToNotenpunkteAnchors);

/** Rechnet einen Punktewert (dezimal) in die Sechserskala um. */
export const toSechser = (notenpunkte: number): number =>
  interpolate(notenpunkte, notenpunkteToSechserAnchors);

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
