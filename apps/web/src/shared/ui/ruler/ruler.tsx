import { useId, useMemo, useRef } from 'react';
import type { Notensystem } from '../../noten/notenwert.ts';
import type { RulerCandidate } from './candidate.ts';
import { Disc, Discs, type DiscWrap, WarnStripes } from './disc.tsx';
import { flag } from './disc-look.ts';
import { useDiscMotion } from './disc-motion.ts';
import { useFulcrum } from './fulcrum.ts';
import type { RulerModel, RulerVariant } from './geometry.ts';
import { figureLabels } from './labels.ts';
import { RulerBar } from './ruler-bar.tsx';
import { useDiscHover, useHostWidth, useRulerLayout } from './ruler-hooks.ts';
import {
  Dimension,
  FigureLabels,
  Fulcrum,
  HeldDiscLayer,
  PreviewWedge,
} from './ruler-layers.tsx';
import { PickerOverlay, type RulerPicker } from './ruler-picker.tsx';
import { scaleFor } from './scale.ts';

export type RulerProps = {
  /** `row` is the thin bar of a list, `bench` the big one of a Fach, `zeugnis` carries one disc per Fach. */
  readonly variant: RulerVariant;
  readonly system: Notensystem;
  readonly model: RulerModel;
  /** Names the figure for screen readers. */
  readonly label: string;
  /** ISO date; a pending disc hangs lower the nearer its date is. */
  readonly today: string;
  readonly className?: string;
  /** The Note being entered, held over the bar. */
  readonly candidate?: RulerCandidate | null;
  /** A Note is being entered: labels step back and there is room to hold a disc. */
  readonly entering?: boolean;
  /**
   * The disc that was just saved. It drops from where the candidate was held,
   * and until it is part of the model the candidate stays held. Clear it when
   * saving fails.
   */
  readonly landingId?: string | null;
  /** The lever arm of one disc to the fulcrum, with its text. */
  readonly dimension?: { readonly id: string; readonly text: string } | null;
  readonly highlightId?: string | null;
  /** Told which disc the pointer or the keyboard focus is on. */
  readonly onHighlight?: (id: string | null) => void;
  /** Wraps what a disc draws, such as in a link to its Leistung. */
  readonly wrapDisc?: DiscWrap;
  /** Lets a Note be chosen on the bar. */
  readonly picker?: RulerPicker | null;
};

const RulerFigure = ({
  candidate = null,
  dimension = null,
  entering = false,
  highlightId = null,
  hostWidth,
  label,
  landingId = null,
  model,
  onHighlight,
  picker = null,
  system,
  today,
  variant,
  wrapDisc,
}: RulerProps & { readonly hostWidth: number }) => {
  const scale = scaleFor(system);
  const stripesId = `stripes-${useId().replaceAll(/[^a-z0-9]/giu, '')}`;
  const { shown, holding, geometry, placed, held } = useRulerLayout({
    candidate,
    entering,
    hostWidth,
    landingId,
    model,
    scale,
    today,
    variant,
  });
  const fulcrum = model.fulcrum === null ? null : scale.unitOf(model.fulcrum);
  const xOf = (value: number): number =>
    geometry.x0 + scale.unitOf(value) * geometry.pitch;

  const figureRef = useRef<SVGSVGElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const discsRef = useRef(new Map<string, SVGGElement>());
  const { balance, captionRef, fulcrumRef, tiltRef, valueRef } = useFulcrum({
    caption: model.caption ?? '',
    geometry,
    scale,
    value: model.fulcrum,
  });
  const motionRefs = useMemo(
    () => ({ figure: figureRef, labels: labelsRef, discs: discsRef }),
    [],
  );
  const { leaving, onLeft } = useDiscMotion({
    balance,
    fulcrum,
    geometry,
    held,
    landingId,
    placed,
    refs: motionRefs,
    scale,
  });
  useDiscHover(figureRef, onHighlight);

  const discs = { highlightId, registry: discsRef, stripesId, wrap: wrapDisc };
  const interactive = wrapDisc !== undefined || picker !== null;

  return (
    <svg
      aria-label={label}
      className="block"
      data-part="ruler"
      data-entering={flag(holding)}
      height={geometry.height}
      ref={figureRef}
      role={interactive ? 'group' : 'img'}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={geometry.width}
    >
      <defs>
        <WarnStripes id={stripesId} />
      </defs>
      <g transform={`translate(0 ${geometry.beamY})`}>
        <g data-part="figure-labels" ref={labelsRef}>
          <FigureLabels
            highlightId={highlightId}
            labels={figureLabels(placed, geometry)}
          />
        </g>
        <g ref={tiltRef}>
          <RulerBar
            height={geometry.beam}
            numerals={geometry.numerals}
            overhang={geometry.overhang}
            pitch={geometry.pitch}
            scale={scale}
            x0={geometry.x0}
          />
          <Discs {...discs} points={placed.filter((point) => !point.waiting)} />
        </g>
        <g data-part="ruler-waiting">
          <Discs {...discs} points={placed.filter((point) => point.waiting)} />
        </g>
        {leaving.map((point) => (
          <Disc
            key={point.id}
            leaving={true}
            onLeft={() => onLeft(point.id)}
            point={point}
            stripesId={stripesId}
          />
        ))}
        {dimension === null || model.fulcrum === null ? null : (
          <Dimension
            focusId={dimension.id}
            fulcrumX={xOf(model.fulcrum)}
            geometry={geometry}
            placed={placed}
            text={dimension.text}
          />
        )}
        {shown === null ||
        shown.fulcrum === null ||
        shown.value === null ? null : (
          <PreviewWedge beam={geometry.beam} x={xOf(shown.fulcrum)} />
        )}
        <g ref={fulcrumRef}>
          <Fulcrum
            captionRef={captionRef}
            phone={geometry.phone}
            valueRef={valueRef}
            variant={variant}
          />
        </g>
        {shown === null || held === null ? null : (
          <HeldDiscLayer candidate={shown} geometry={geometry} held={held} />
        )}
        {picker === null ? null : (
          <PickerOverlay geometry={geometry} picker={picker} scale={scale} />
        )}
      </g>
    </svg>
  );
};

/**
 * The ruler every Note lands on. Discs rest on it at their value, a disc's
 * area is its share of the Schnitt, and the fulcrum stands where they
 * balance. The figure fills the width it is given.
 */
export const Ruler = (props: RulerProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useHostWidth(hostRef);
  return (
    <div className={`min-w-0 ${props.className ?? ''}`} ref={hostRef}>
      {width === null ? null : <RulerFigure {...props} hostWidth={width} />}
    </div>
  );
};
