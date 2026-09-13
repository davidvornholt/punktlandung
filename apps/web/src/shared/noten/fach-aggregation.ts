import type {
  Artgewichtung,
  Assessment,
  Fachgewichtung,
  Leistungsart,
  Wertungsbereich,
} from './notenwert.ts';
import {
  bereichDerLeistungsart,
  leistungsarten,
  wertungsbereiche,
} from './notenwert.ts';

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
export const sammelnote = (
  assessments: ReadonlyArray<Assessment>,
): number | null =>
  average(
    assessments.map((assessment) => ({
      value: assessment.notenwert,
      weight: assessment.individualGewichtung,
    })),
  );

const contributionsForLeistungsart = (
  assessments: ReadonlyArray<Assessment>,
  leistungsartGewichtung: Artgewichtung,
): ReadonlyArray<Contribution> => {
  if (leistungsartGewichtung.sammlung === 'einzeln') {
    return assessments.map((assessment) => ({
      value: assessment.notenwert,
      weight: assessment.individualGewichtung * leistungsartGewichtung.gewicht,
    }));
  }
  const collected = sammelnote(assessments);
  return collected === null
    ? []
    : [{ value: collected, weight: leistungsartGewichtung.gewicht }];
};

/** Alle Beiträge eines Bereichs; `null` sammelt über alle Bereiche hinweg. */
const contributions = (
  assessments: ReadonlyArray<Assessment>,
  fachGewichtung: Fachgewichtung,
  wertungsbereich: Wertungsbereich | null,
): ReadonlyArray<Contribution> =>
  leistungsarten.flatMap((leistungsart) => {
    if (
      wertungsbereich !== null &&
      bereichDerLeistungsart[leistungsart] !== wertungsbereich
    ) {
      return [];
    }
    return contributionsForLeistungsart(
      assessments.filter(
        (assessment) => assessment.leistungsart === leistungsart,
      ),
      fachGewichtung.arten[leistungsart],
    );
  });

export type FachEvaluation = {
  /** Fachschnitt im nativen System; null, solange nichts zählt. */
  readonly average: number | null;
  readonly schriftlichAverage: number | null;
  readonly muendlichAverage: number | null;
};

/**
 * Wertet ein Fach vollständig aus: die beiden Bereichsschnitte und daraus den
 * Fachschnitt — entweder als eine gemeinsame gewichtete Liste oder nach dem
 * verkündeten Verhältnis. Ein Bereich ohne Noten oder ohne Anteil zählt nicht
 * mit, sodass der vorhandene Bereich allein steht.
 */
export const evaluateFach = (
  assessments: ReadonlyArray<Assessment>,
  fachGewichtung: Fachgewichtung,
): FachEvaluation => {
  const schriftlichAverage = average(
    contributions(assessments, fachGewichtung, 'schriftlich'),
  );
  const muendlichAverage = average(
    contributions(assessments, fachGewichtung, 'muendlich'),
  );
  const { verhaeltnis } = fachGewichtung;
  if (verhaeltnis === null) {
    return {
      average: average(contributions(assessments, fachGewichtung, null)),
      schriftlichAverage,
      muendlichAverage,
    };
  }
  const wertungsbereichContributions = [
    { value: schriftlichAverage, weight: verhaeltnis.schriftlich },
    { value: muendlichAverage, weight: verhaeltnis.muendlich },
  ].flatMap((contribution) =>
    contribution.value === null || contribution.weight <= 0
      ? []
      : [{ value: contribution.value, weight: contribution.weight }],
  );
  return {
    average: average(wertungsbereichContributions),
    schriftlichAverage,
    muendlichAverage,
  };
};

/** Fachschnitt im nativen System des Halbjahrs. */
export const fachAverage = (
  assessments: ReadonlyArray<Assessment>,
  fachGewichtung: Fachgewichtung,
): number | null => evaluateFach(assessments, fachGewichtung).average;

/** Eine Leistung, wie sie in die Gewichtung eingeht — mit oder ohne Note. */
export type GewichteteLeistung = {
  readonly id: string;
  readonly individualGewichtung: number;
  readonly leistungsart: Leistungsart;
};

const sumWeights = (
  leistungen: ReadonlyArray<GewichteteLeistung>,
  weights: ReadonlyMap<string, number>,
): number =>
  leistungen.reduce(
    (total, leistung) => total + (weights.get(leistung.id) ?? 0),
    0,
  );

/**
 * Das Gewicht einer Leistung in ihrer Art, nach `contributionsForLeistungsart`:
 * einzeln trägt sie ihr Einzelgewicht mal Artgewicht, gesammelt ihren Anteil
 * am Artgewicht der einen Sammelnote.
 */
const weightWithinArt = (
  leistung: GewichteteLeistung,
  art: Artgewichtung,
  individualTotal: number,
): number => {
  if (art.sammlung === 'einzeln') {
    return leistung.individualGewichtung * art.gewicht;
  }
  return individualTotal === 0
    ? 0
    : (art.gewicht * leistung.individualGewichtung) / individualTotal;
};

const leistungWeights = (
  leistungen: ReadonlyArray<GewichteteLeistung>,
  fachGewichtung: Fachgewichtung,
): ReadonlyMap<string, number> => {
  const weights = new Map<string, number>();
  for (const leistungsart of leistungsarten) {
    const ofArt = leistungen.filter(
      (leistung) => leistung.leistungsart === leistungsart,
    );
    const art = fachGewichtung.arten[leistungsart];
    const individualTotal = ofArt.reduce(
      (total, leistung) => total + leistung.individualGewichtung,
      0,
    );
    for (const leistung of ofArt) {
      weights.set(leistung.id, weightWithinArt(leistung, art, individualTotal));
    }
  }
  return weights;
};

/**
 * Anteil jeder Leistung am Fachschnitt (0–1), gerechnet über alle Leistungen
 * des Fachs im Halbjahr — auch die ausstehenden. Folgt derselben Regel wie
 * `evaluateFach`: ohne Verhältnis eine gemeinsame Liste, sonst je Bereich,
 * wobei ein Bereich ohne Leistung oder ohne Anteil nicht mitzählt. Die Summe
 * über alle Leistungen ist 1, sobald eine dabei ist.
 */
export const leistungsanteile = (
  leistungen: ReadonlyArray<GewichteteLeistung>,
  fachGewichtung: Fachgewichtung,
): ReadonlyMap<string, number> => {
  const weights = leistungWeights(leistungen, fachGewichtung);
  const { verhaeltnis } = fachGewichtung;
  const anteile = new Map<string, number>();
  if (verhaeltnis === null) {
    const total = sumWeights(leistungen, weights);
    for (const leistung of leistungen) {
      anteile.set(
        leistung.id,
        total === 0 ? 0 : (weights.get(leistung.id) ?? 0) / total,
      );
    }
    return anteile;
  }
  const bereiche = wertungsbereiche.flatMap((bereich) => {
    const total = sumWeights(
      leistungen.filter(
        (leistung) => bereichDerLeistungsart[leistung.leistungsart] === bereich,
      ),
      weights,
    );
    const anteil = verhaeltnis[bereich];
    return total > 0 && anteil > 0 ? [{ bereich, total, anteil }] : [];
  });
  const anteilTotal = bereiche.reduce((sum, entry) => sum + entry.anteil, 0);
  for (const leistung of leistungen) {
    const own = bereiche.find(
      (entry) =>
        entry.bereich === bereichDerLeistungsart[leistung.leistungsart],
    );
    anteile.set(
      leistung.id,
      own === undefined || anteilTotal === 0
        ? 0
        : ((weights.get(leistung.id) ?? 0) / own.total) *
            (own.anteil / anteilTotal),
    );
  }
  return anteile;
};
