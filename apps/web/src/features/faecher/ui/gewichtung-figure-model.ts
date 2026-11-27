import { verhaeltnisProzent } from '#/shared/noten/gewichtung-text.ts';
import {
  leistungsartLabel,
  leistungsartPlural,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type {
  Fachgewichtung,
  Leistungsart,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import {
  bereichDerLeistungsart,
  wertungsbereiche,
} from '#/shared/noten/notenwert.ts';

/**
 * A Gewichtung as a picture: how the Fachschnitt is split between the two
 * Wertungsbereiche, and what one Note of each Leistungsart weighs beside the
 * others. Weights only compare where a Note of one Art can be traded against
 * a Note of another: inside a Wertungsbereich when the teacher announced a
 * Verhältnis, across all of them in one list.
 */

export type ArtDisc = {
  readonly kind: Leistungsart;
  readonly bereich: Wertungsbereich;
  /** "Klausur", or "Tests zusammen" when all Noten of the Art share one disc. */
  readonly label: string;
  /** "×2": the announced weight, named where the weights of a group differ. */
  readonly factor: string | null;
  /** The area of the disc beside the largest one of its group (0 to 1). */
  readonly area: number;
  /** All Noten of the Art count together as a single Note. */
  readonly shared: boolean;
};

export type ArtGroup = {
  /** `null` is the one list in which every Note is weighed against every other. */
  readonly bereich: Wertungsbereich | null;
  /** The share of the Fachschnitt in whole percent; `null` in the one list. */
  readonly percent: number | null;
  readonly discs: ReadonlyArray<ArtDisc>;
};

const formatFactor = (gewicht: number): string =>
  `×${`${gewicht}`.replace('.', ',')}`;

const group = (
  gewichtung: Fachgewichtung,
  bereich: Wertungsbereich | null,
  percent: number | null,
): ArtGroup => {
  const kinds = leistungsartReihenfolge.filter(
    (kind) => bereich === null || bereichDerLeistungsart[kind] === bereich,
  );
  const gewichte = kinds.map((kind) => gewichtung.arten[kind].gewicht);
  const heaviest = Math.max(...gewichte);
  const differ = gewichte.some((gewicht) => gewicht !== heaviest);
  return {
    bereich,
    percent,
    discs: kinds.map((kind) => {
      const { gewicht, sammlung } = gewichtung.arten[kind];
      const shared = sammlung === 'gesammelt';
      return {
        kind,
        bereich: bereichDerLeistungsart[kind],
        label: shared
          ? `${leistungsartPlural[kind]} zusammen`
          : leistungsartLabel[kind],
        factor: differ && gewicht !== 1 ? formatFactor(gewicht) : null,
        area: heaviest > 0 ? gewicht / heaviest : 0,
        shared,
      };
    }),
  };
};

/** One group for one list, otherwise one per Wertungsbereich. */
export const gewichtungGroups = (
  gewichtung: Fachgewichtung,
): ReadonlyArray<ArtGroup> => {
  const { verhaeltnis } = gewichtung;
  if (verhaeltnis === null) {
    return [group(gewichtung, null, null)];
  }
  const percent =
    verhaeltnis.schriftlich + verhaeltnis.muendlich > 0
      ? verhaeltnisProzent(verhaeltnis)
      : { schriftlich: 0, muendlich: 0 };
  return wertungsbereiche.map((bereich) =>
    group(gewichtung, bereich, percent[bereich]),
  );
};

/** The disc of one Leistungsart, wherever its group is. */
export const artDisc = (
  gewichtung: Fachgewichtung,
  kind: Leistungsart,
): ArtDisc | undefined =>
  gewichtungGroups(gewichtung)
    .flatMap((entry) => entry.discs)
    .find((disc) => disc.kind === kind);
