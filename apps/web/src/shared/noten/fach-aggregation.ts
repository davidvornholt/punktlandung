import type {
  Artgewichtung,
  Assessment,
  Fachgewichtung,
  Wertungsbereich,
} from './notenwert.ts';
import { bereichDerLeistungsart, leistungsarten } from './notenwert.ts';

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
