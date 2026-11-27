import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type HeldDisc,
  holdCandidate,
  type RulerCandidate,
  standIn,
} from './candidate.ts';
import {
  candidateId,
  type Geometry,
  measure,
  type PlacedPoint,
  type RulerModel,
  type RulerVariant,
} from './geometry.ts';
import { placePoints, waitingPoints, withRoomFor } from './parking.ts';
import type { RulerScale } from './scale.ts';

/** The host's width once it is known, and again whenever it changes. */
export const useHostWidth = (
  hostRef: RefObject<HTMLElement | null>,
): number | null => {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = hostRef.current;
    if (element === null) {
      return;
    }
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [hostRef]);
  return width;
};

/** Tells which disc the pointer or the focus is on, with one listener for the whole figure. */
export const useDiscHover = (
  figureRef: RefObject<SVGSVGElement | null>,
  onHighlight: ((id: string | null) => void) | undefined,
): void => {
  useEffect(() => {
    const element = figureRef.current;
    if (element === null || onHighlight === undefined) {
      return;
    }
    const enter = (event: Event): void => {
      const disc =
        event.target instanceof Element
          ? event.target.closest('[data-disc]')
          : null;
      onHighlight(disc?.getAttribute('data-disc') ?? null);
    };
    const leave = (): void => onHighlight(null);
    /*
     * Focus is listened for on the HTML element around the figure. A browser
     * lets an SVG element that listens for focus take it, so the figure
     * itself would become a stop for the Tab key on every bar.
     */
    const focusHost = element.parentElement ?? element;
    element.addEventListener('pointerover', enter);
    element.addEventListener('pointerleave', leave);
    focusHost.addEventListener('focusin', enter);
    focusHost.addEventListener('focusout', leave);
    return () => {
      element.removeEventListener('pointerover', enter);
      element.removeEventListener('pointerleave', leave);
      focusHost.removeEventListener('focusin', enter);
      focusHost.removeEventListener('focusout', leave);
    };
  }, [figureRef, onHighlight]);
};

/**
 * The candidate to draw: the one being entered, or the one that was just
 * saved for as long as its disc has not arrived in the model.
 */
const useShownCandidate = (
  candidate: RulerCandidate | null,
  landingId: string | null,
  model: RulerModel,
): RulerCandidate | null => {
  const lastRef = useRef<RulerCandidate | null>(null);
  const arrived =
    landingId === null || model.points.some((point) => point.id === landingId);
  useEffect(() => {
    if (candidate !== null) {
      lastRef.current = candidate;
    } else if (arrived) {
      // Once its disc lies on the bar the candidate is done with, so removing that disc later does not bring it back.
      lastRef.current = null;
    }
  }, [candidate, arrived]);
  if (candidate !== null) {
    return candidate;
  }
  return arrived ? null : lastRef.current;
};

/**
 * Where everything in the figure lies for the model it is given: the frame,
 * every disc, and the disc being entered if there is one.
 */
export const useRulerLayout = ({
  candidate,
  entering,
  hostWidth,
  landingId,
  model,
  scale,
  today,
  variant,
}: {
  readonly candidate: RulerCandidate | null;
  readonly entering: boolean;
  readonly hostWidth: number;
  readonly landingId: string | null;
  readonly model: RulerModel;
  readonly scale: RulerScale;
  readonly today: string;
  readonly variant: RulerVariant;
}): {
  readonly shown: RulerCandidate | null;
  /** A disc is or may be held, so the figure keeps room for it and its labels step back. */
  readonly holding: boolean;
  readonly geometry: Geometry;
  readonly placed: ReadonlyArray<PlacedPoint>;
  readonly held: HeldDisc | null;
} => {
  const shown = useShownCandidate(candidate, landingId, model);
  const holding = entering || shown !== null;
  // The disc an entry changes is taken off the bar; the figure keeps its size.
  const points = useMemo(
    () => model.points.filter((point) => point.id !== shown?.replaces),
    [model.points, shown?.replaces],
  );
  // A disc entered without a Note waits among the waiting ones, which make room.
  const parked = useMemo(
    () =>
      shown === null || shown.value !== null
        ? points
        : [...points, standIn(shown)],
    [points, shown],
  );
  const geometry = useMemo(() => {
    const frame = measure({
      entering: holding,
      hostWidth,
      model,
      scale,
      variant,
    });
    const waiting =
      shown === null
        ? points
        : [...points, { ...standIn(shown), value: null, date: shown.date }];
    return withRoomFor(frame, waitingPoints(waiting, frame, today));
  }, [holding, hostWidth, model, points, scale, shown, today, variant]);
  const placed = useMemo(
    () =>
      placePoints(parked, scale, geometry, today).filter(
        (point) => point.id !== candidateId,
      ),
    [parked, scale, geometry, today],
  );
  const held = useMemo(
    () =>
      shown === null
        ? null
        : holdCandidate({ candidate: shown, geometry, points, scale, today }),
    [shown, geometry, points, scale, today],
  );
  return { shown, holding, geometry, placed, held };
};
