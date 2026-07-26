/**
 * Reine Notenmathematik. Zwei Systeme: "sechser" (1–6, kleiner ist besser)
 * und "punkte" (Notenpunkte 0–15, größer ist besser).
 */

export type Notensystem = 'sechser' | 'punkte';

/** Leistungsarten eines Fachs; die Reihenfolge ist die des grade_kind-Enums. */
export const leistungsarten = [
  'klausur',
  'test',
  'muendlich',
  'gfs',
  'sonstige',
] as const;

export type Leistungsart = (typeof leistungsarten)[number];

export const wertungsbereiche = ['schriftlich', 'muendlich'] as const;

export type Wertungsbereich = (typeof wertungsbereiche)[number];

/**
 * In welchen Bereich eine Leistungsart fällt. Das ist eine Eigenschaft der Art
 * selbst, keine Verkündung: eine Klausur, eine GFS und ein Test sind
 * schriftliche Arbeiten, mündliche und sonstige Noten der zweite Bereich. Die
 * Lehrkraft verkündet das Verhältnis der Bereiche, nicht ihre Besetzung.
 */
export const bereichDerLeistungsart: Readonly<
  Record<Leistungsart, Wertungsbereich>
> = {
  klausur: 'schriftlich',
  gfs: 'schriftlich',
  test: 'schriftlich',
  muendlich: 'muendlich',
  sonstige: 'muendlich',
};

/**
 * Wie die Noten einer Leistungsart in den Schnitt eingehen: einzeln zählt
 * jede für sich, gesammelt mitteln alle zu einer einzigen Note — so wird aus
 * "alle Tests zusammen zählen wie eine Klausur" echte Notenmathematik.
 */
export type Sammlung = 'einzeln' | 'gesammelt';

export type Assessment = {
  readonly notenwert: number;
  /** Individuelles Zusatzgewicht innerhalb der Leistungsart. */
  readonly individualGewichtung: number;
  readonly leistungsart: Leistungsart;
};

/** Gewichtung einer Leistungsart, wie von der Lehrkraft verkündet. */
export type Artgewichtung = {
  readonly gewicht: number;
  readonly sammlung: Sammlung;
};

/**
 * Verhältnis der Bereiche, wie die Lehrkraft es nennt: "60:40" und "3:1"
 * bleiben so erhalten, wie sie verkündet wurden, und werden erst beim
 * Rechnen normalisiert.
 */
export type Bereichsverhaeltnis = {
  readonly schriftlich: number;
  readonly muendlich: number;
};

export type Fachgewichtung = {
  /** null = eine gemeinsame gewichtete Liste über alle Leistungsarten. */
  readonly verhaeltnis: Bereichsverhaeltnis | null;
  readonly arten: Readonly<Record<Leistungsart, Artgewichtung>>;
};

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
