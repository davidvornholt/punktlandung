import {
  gewichtungsSaetze,
  verhaeltnisProzent,
} from '#/shared/noten/gewichtung-text.ts';
import {
  bereichTitel,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type {
  Leistungsart,
  Notensystem,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import {
  bereichDerLeistungsart,
  wertungsbereiche,
} from '#/shared/noten/notenwert.ts';
import { labelClass } from '#/shared/ui/form-classes.ts';
import { CalculationExample } from './calculation-example.tsx';
import type { GewichtungAction, GewichtungState } from './gewichtung-model.ts';
import { gewichtungAffectsAverage } from './gewichtung-model.ts';
import type { RowControl } from './gewichtung-row.tsx';
import { GewichtungRow } from './gewichtung-row.tsx';
import { VerhaeltnisChoice } from './verhaeltnis-choice.tsx';

const controlFor = (kind: Leistungsart, state: GewichtungState): RowControl => {
  if (kind === 'gfs') {
    return {
      type: 'coupling',
      kind: 'gfs',
      text: 'Zählt wie eine Klausur',
      active: state.gfsFollowsKlausur,
    };
  }
  if (kind === 'sonstige') {
    return {
      type: 'coupling',
      kind: 'sonstige',
      text: 'Zählt wie eine mündliche Note',
      active: state.sonstigeFollowsMuendlich,
    };
  }
  if (kind === 'test') {
    return { type: 'collection', coupled: state.testsFollowKlausur };
  }
  return {
    type: 'weight',
    effective: gewichtungAffectsAverage(kind, state),
  };
};

const LeistungsartList = ({
  arten,
  state,
  onAction,
}: {
  readonly arten: ReadonlyArray<Leistungsart>;
  readonly state: GewichtungState;
  readonly onAction: (action: GewichtungAction) => void;
}) => (
  <div>
    {arten.map((kind) => (
      <GewichtungRow
        art={state.gewichtung.arten[kind]}
        control={controlFor(kind, state)}
        key={kind}
        kind={kind}
        onAction={onAction}
      />
    ))}
  </div>
);

const WertungsbereichGroup = ({
  bereich,
  percent,
  state,
  onAction,
}: {
  readonly bereich: Wertungsbereich;
  readonly percent: number;
  readonly state: GewichtungState;
  readonly onAction: (action: GewichtungAction) => void;
}) => (
  <div className="mt-5">
    <p className={labelClass}>
      {bereichTitel[bereich]} · {percent} %
    </p>
    <LeistungsartList
      arten={leistungsartReihenfolge.filter(
        (kind) => bereichDerLeistungsart[kind] === bereich,
      )}
      onAction={onAction}
      state={state}
    />
  </div>
);

/** Das Gewichtungsfeld des Fachformulars — die verkündete Regel als Eingabe. */
export const GewichtungField = ({
  state,
  system,
  onAction,
}: {
  readonly state: GewichtungState;
  readonly system: Notensystem;
  readonly onAction: (action: GewichtungAction) => void;
}) => {
  const { verhaeltnis } = state.gewichtung;
  const percent = verhaeltnis === null ? null : verhaeltnisProzent(verhaeltnis);
  return (
    <fieldset className="mt-5 border border-border p-4">
      <legend className={`${labelClass} px-1`}>Gewichtung</legend>
      <p className="text-ink-muted text-sm">
        Trage ein, was die Lehrkraft verkündet hat — etwa „60:40
        schriftlich:mündlich“ oder „alle Tests zusammen zählen wie eine
        Klausur“.
      </p>
      <div className="mt-3">
        <VerhaeltnisChoice onAction={onAction} verhaeltnis={verhaeltnis} />
      </div>
      {percent === null ? (
        <div className="mt-5">
          <LeistungsartList
            arten={leistungsartReihenfolge}
            onAction={onAction}
            state={state}
          />
        </div>
      ) : (
        wertungsbereiche.map((bereich) => (
          <WertungsbereichGroup
            bereich={bereich}
            key={bereich}
            onAction={onAction}
            percent={percent[bereich]}
            state={state}
          />
        ))
      )}
      <p className="mt-4 text-ink-muted text-sm">
        {gewichtungsSaetze(state.gewichtung).join(' · ')}
      </p>
      <CalculationExample gewichtung={state.gewichtung} system={system} />
    </fieldset>
  );
};
