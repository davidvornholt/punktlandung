/**
 * Reine Notenmathematik. Zwei Systeme: "sechser" (1–6, kleiner ist besser)
 * und "punkte" (Notenpunkte 0–15, größer ist besser). Amtliche Umrechnung:
 * Punkte = 17 − 3 × Note.
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

export type Leistung = {
  readonly value: number;
  /** Individuelles Zusatzgewicht innerhalb der Leistungsart. */
  readonly weight: number;
  readonly kind: Leistungsart;
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

/** Amtliche Umrechnungskonstanten: Punkte = 17 − 3 × Note. */
const umrechnungsBasis = 17;
const punkteProNotenstufe = 3;
const punkteMin = 0;
const punkteMax = 15;

/** Normalisiert einen nativen Wert auf die Punkteskala (0–15, dezimal). */
export const zuPunkten = (value: number, system: Notensystem): number => {
  const punkte =
    system === 'punkte'
      ? value
      : umrechnungsBasis - punkteProNotenstufe * value;
  return Math.min(punkteMax, Math.max(punkteMin, punkte));
};

/** Rechnet einen Punktewert (dezimal) in die Sechserskala um. */
export const zuSechser = (punkte: number): number =>
  (umrechnungsBasis - punkte) / punkteProNotenstufe;

/** Ein wertbarer Posten: eine Einzelnote oder eine gemittelte Sammelnote. */
type Contribution = {
  readonly value: number;
  readonly weight: number;
};

const average = (items: ReadonlyArray<Contribution>): number | null => {
  let sum = 0;
  let weights = 0;
  for (const contribution of items) {
    sum += contribution.value * contribution.weight;
    weights += contribution.weight;
  }
  return weights === 0 ? null : sum / weights;
};

/**
 * Die eine Note, mit der eine gesammelte Leistungsart antritt: das Mittel
 * ihrer Einzelnoten. Auch die Vorschau im Formular zeigt genau diesen Wert.
 */
export const sammelnote = (noten: ReadonlyArray<Leistung>): number | null =>
  average(noten.map((note) => ({ value: note.value, weight: note.weight })));

const contributionsOfArt = (
  noten: ReadonlyArray<Leistung>,
  art: Artgewichtung,
): ReadonlyArray<Contribution> => {
  if (art.sammlung === 'einzeln') {
    return noten.map((note) => ({
      value: note.value,
      weight: note.weight * art.gewicht,
    }));
  }
  const gesammelt = sammelnote(noten);
  return gesammelt === null ? [] : [{ value: gesammelt, weight: art.gewicht }];
};

/** Alle Beiträge eines Bereichs; `null` sammelt über alle Bereiche hinweg. */
const contributions = (
  leistungen: ReadonlyArray<Leistung>,
  gewichtung: Fachgewichtung,
  bereich: Wertungsbereich | null,
): ReadonlyArray<Contribution> =>
  leistungsarten.flatMap((kind) => {
    if (bereich !== null && bereichDerLeistungsart[kind] !== bereich) {
      return [];
    }
    return contributionsOfArt(
      leistungen.filter((leistung) => leistung.kind === kind),
      gewichtung.arten[kind],
    );
  });

export type Fachauswertung = {
  /** Fachschnitt im nativen System; null, solange nichts zählt. */
  readonly schnitt: number | null;
  readonly schriftlich: number | null;
  readonly muendlich: number | null;
};

/**
 * Wertet ein Fach vollständig aus: die beiden Bereichsschnitte und daraus den
 * Fachschnitt — entweder als eine gemeinsame gewichtete Liste oder nach dem
 * verkündeten Verhältnis. Ein Bereich ohne Noten oder ohne Anteil zählt nicht
 * mit, sodass der vorhandene Bereich allein steht.
 */
export const fachauswertung = (
  leistungen: ReadonlyArray<Leistung>,
  gewichtung: Fachgewichtung,
): Fachauswertung => {
  const schriftlich = average(
    contributions(leistungen, gewichtung, 'schriftlich'),
  );
  const muendlich = average(contributions(leistungen, gewichtung, 'muendlich'));
  const { verhaeltnis } = gewichtung;
  if (verhaeltnis === null) {
    return {
      schnitt: average(contributions(leistungen, gewichtung, null)),
      schriftlich,
      muendlich,
    };
  }
  const bereichContributions = [
    { value: schriftlich, weight: verhaeltnis.schriftlich },
    { value: muendlich, weight: verhaeltnis.muendlich },
  ].flatMap((contribution) =>
    contribution.value === null || contribution.weight <= 0
      ? []
      : [{ value: contribution.value, weight: contribution.weight }],
  );
  return { schnitt: average(bereichContributions), schriftlich, muendlich };
};

/** Fachschnitt im nativen System des Halbjahrs. */
export const fachschnitt = (
  leistungen: ReadonlyArray<Leistung>,
  gewichtung: Fachgewichtung,
): number | null => fachauswertung(leistungen, gewichtung).schnitt;
