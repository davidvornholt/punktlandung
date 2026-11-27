import { tenths } from '#/shared/ui/ruler/geometry.ts';
import { scaleUnits } from '#/shared/ui/ruler/scale.ts';

/**
 * Where every Note of the Übersicht lies on the bar: one pile per whole
 * Notenpunkt, in which each dot drops to the lowest place its column still
 * has. Noten land in the order they are given, so a later one always rests on
 * earlier ones and can leave again without anything under it moving. All of
 * it is plain arithmetic, so it can be tested without a browser.
 */

export type HeroNote = {
  /** Notenpunkte, 0 to 15. */
  readonly punkte: number;
  /** The Note's share of the Gesamtschnitt (0 to 1). The dot's area shows it. */
  readonly mass: number;
};

export type HeroDot = {
  readonly x: number;
  /** The centre's distance below the figure's top. */
  readonly y: number;
  readonly r: number;
};

export type HeroLayout = {
  readonly width: number;
  readonly height: number;
  /** Too narrow for the wide layout: a thinner bar and a smaller figure. */
  readonly phone: boolean;
  /** The width of one of the bar's 16 units. */
  readonly pitch: number;
  readonly beam: number;
  /** How far the bar's top edge lies below the figure's top. */
  readonly beamY: number;
  /** One dot per Note, in the order the Noten were given. */
  readonly dots: ReadonlyArray<HeroDot>;
};

const limits = {
  minWidth: 240,
  phoneBelow: 640,
  beam: 48,
  phoneBeam: 38,
  /** The radius of the heaviest dot, as a share of one unit of the bar. */
  radius: 0.3,
  phoneRadius: 0.43,
  minRadius: 2.4,
  /** The piles may not grow past this height; all dots shrink until they fit. */
  maxPile: 330,
  phoneMaxPile: 190,
  shrinkTries: 6,
  shrinkMargin: 0.95,
  headroom: 22,
  phoneHeadroom: 14,
  /** Room under the bar for the fulcrum and the Gesamtschnitt. */
  foot: 184,
  phoneFoot: 132,
  /** The share of a unit a pile may take: the rest is the air that keeps the piles apart. */
  columnShare: 0.74,
  /** A hair of air between two dots that touch. */
  contactGap: 0.6,
  /** How finely the places in a column are tried. */
  step: 0.5,
  tolerance: 0.01,
  maxNotenpunkte: 15,
  half: 0.5,
} as const;

/** A dot while it settles; `y` is measured from the bar's top edge, upwards negative. */
type Settling = { readonly x: number; readonly y: number; readonly r: number };

/** How low a dot at `x` can drop before it rests on the bar or on a dot already there. */
const restAt = (x: number, r: number, placed: ReadonlyArray<Settling>) =>
  placed.reduce((y, other) => {
    const dx = Math.abs(x - other.x);
    const reach = r + other.r + limits.contactGap;
    return dx < reach
      ? Math.min(y, other.y - Math.sqrt(reach * reach - dx * dx))
      : y;
  }, -r);

/**
 * The place in a column where a dot comes to rest lowest. Places are tried
 * from the middle outwards and only a lower one wins, so piles grow from
 * their middle.
 */
const lowestPlace = (
  centre: number,
  room: number,
  r: number,
  placed: ReadonlyArray<Settling>,
): Settling => {
  let best: Settling = { x: centre, y: restAt(centre, r, placed), r };
  for (let offset = limits.step; offset <= room; offset += limits.step) {
    for (const x of [centre - offset, centre + offset]) {
      const y = restAt(x, r, placed);
      if (y > best.y + limits.tolerance) {
        best = { x, y, r };
      }
    }
  }
  return best;
};

const columnOf = (punkte: number): number =>
  Math.max(0, Math.min(limits.maxNotenpunkte, Math.round(punkte)));

const settleAll = (
  notes: ReadonlyArray<HeroNote>,
  pitch: number,
  radiusOf: (mass: number) => number,
): ReadonlyArray<Settling> => {
  const columns = new Map<number, Array<Settling>>();
  return notes.map((note) => {
    const column = columnOf(note.punkte);
    const placed = columns.get(column) ?? [];
    const r = radiusOf(note.mass);
    const room = Math.max(0, (pitch * limits.columnShare) / 2 - r);
    const dot = lowestPlace((column + limits.half) * pitch, room, r, placed);
    placed.push(dot);
    columns.set(column, placed);
    return dot;
  });
};

/** How high the highest pile reaches above the bar. */
const pileHeight = (dots: ReadonlyArray<Settling>): number =>
  dots.reduce((height, dot) => Math.max(height, dot.r - dot.y), 0);

/**
 * A dot's radius. Areas are in proportion to the masses, so the heaviest Note
 * gets the full radius; a Note that weighs next to nothing stays visible. Only
 * when even the heaviest dot has shrunk below that smallest size do all dots
 * get smaller than it.
 */
const radiusBy = (full: number, heaviest: number) => {
  const smallest = Math.min(limits.minRadius, full);
  return (mass: number): number =>
    heaviest <= 0
      ? smallest
      : Math.max(smallest, full * Math.sqrt(mass / heaviest));
};

export const heroLayout = (
  notes: ReadonlyArray<HeroNote>,
  hostWidth: number,
): HeroLayout => {
  const width = Math.max(limits.minWidth, Math.floor(hostWidth));
  const phone = width < limits.phoneBelow;
  const pitch = width / scaleUnits;
  const heaviest = notes.reduce((max, note) => Math.max(max, note.mass), 0);
  const maxPile = phone ? limits.phoneMaxPile : limits.maxPile;
  let full = pitch * (phone ? limits.phoneRadius : limits.radius);
  let settled = settleAll(notes, pitch, radiusBy(full, heaviest));
  for (
    let attempt = 0;
    attempt < limits.shrinkTries && pileHeight(settled) > maxPile;
    attempt += 1
  ) {
    full *= Math.sqrt(maxPile / pileHeight(settled)) * limits.shrinkMargin;
    settled = settleAll(notes, pitch, radiusBy(full, heaviest));
  }
  const beam = phone ? limits.phoneBeam : limits.beam;
  const beamY = Math.ceil(
    Math.max(pileHeight(settled), full * 2) +
      (phone ? limits.phoneHeadroom : limits.headroom),
  );
  return {
    width,
    height: beamY + beam + (phone ? limits.phoneFoot : limits.foot),
    phone,
    pitch,
    beam,
    beamY,
    dots: settled.map((dot) => ({
      x: tenths(dot.x),
      y: tenths(dot.y + beamY),
      r: tenths(dot.r),
    })),
  };
};
