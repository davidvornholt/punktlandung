import {
  candidateId,
  type DiscKind,
  type Geometry,
  landedPoints,
  type RulerPoint,
  stackHeight,
} from './geometry.ts';
import { waitingPoints } from './parking.ts';
import type { RulerScale } from './scale.ts';

export type RulerCandidate = {
  /** `null` holds the disc off the bar: it will be entered without a Note. */
  readonly value: number | null;
  readonly date: string;
  readonly mass: number;
  readonly kind: Exclude<DiscKind, 'fach'>;
  /** Where the Fach would balance with this Note. */
  readonly fulcrum: number | null;
  /** The disc this entry changes; it is taken off the bar meanwhile. */
  readonly replaces: string | null;
  /** Said beside the held disc, such as "11 P." or "zählt 25 %". */
  readonly text: string;
};

export type HeldDisc = {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Where the disc would come to rest; the plumb line ends there. */
  readonly restY: number;
  readonly parked: boolean;
};

const holding = {
  minRadius: 4,
  clearance: 12,
  minLift: 22,
  minHeight: 30,
  /** Sorts the held disc after every dated one, so it lands on top. */
  lastDate: '9999-12-31',
} as const;

/**
 * The disc being entered as a point among the others, so they can be placed
 * together: a held disc lands last, one without a Note waits by its date.
 */
export const standIn = (candidate: RulerCandidate): RulerPoint => ({
  id: candidateId,
  value: candidate.value,
  mass: candidate.mass,
  kind: candidate.kind,
  state: 'pending',
  date: candidate.value === null ? candidate.date : holding.lastDate,
});

/**
 * Where the disc being entered is held. With a value it hangs like a load on
 * a crane, at one height above everything that has landed, straight over the
 * place it would drop to. Without one it waits where pending discs wait, and
 * they make room for it.
 */
export const holdCandidate = ({
  candidate,
  geometry,
  points,
  scale,
  today,
}: {
  readonly candidate: RulerCandidate;
  readonly geometry: Geometry;
  readonly points: ReadonlyArray<RulerPoint>;
  readonly scale: RulerScale;
  readonly today: string;
}): HeldDisc => {
  const parked = candidate.value === null;
  const all = [
    ...points.filter((point) => point.id !== candidate.replaces),
    standIn(candidate),
  ];
  if (parked) {
    const held = waitingPoints(all, geometry, today).find(
      (point) => point.id === candidateId,
    );
    const r = Math.max(holding.minRadius, held?.r ?? 0);
    return { x: held?.x ?? 0, y: held?.y ?? 0, r, restY: held?.y ?? 0, parked };
  }
  const landed = landedPoints(all, scale, geometry);
  const rest = landed.find((point) => point.id === candidateId);
  const r = Math.max(holding.minRadius, rest?.r ?? 0);
  const restY = rest?.y ?? -r;
  const top = -stackHeight(landed.filter((point) => point.id !== candidateId));
  return {
    x: rest?.x ?? 0,
    y: Math.min(
      top - r - holding.clearance,
      restY - holding.minLift,
      -r - holding.minHeight,
    ),
    r,
    restY,
    parked,
  };
};
