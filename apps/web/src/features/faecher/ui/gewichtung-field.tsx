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
import { hintClass } from '#/shared/ui/form-classes.ts';
import { CalculationExample } from './calculation-example.tsx';
import { artDisc } from './gewichtung-figure-model.ts';
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

const groupTitleClass = 'pt-5 pb-2 font-bold text-ink-soft text-sm';

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
        disc={artDisc(state.gewichtung, kind)}
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
  <div>
    <p className={groupTitleClass}>
      {bereichTitel[bereich]} · {percent}&nbsp;%
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

/**
 * Das Gewichtungsfeld des Fachformulars: links die verkündete Regel als
 * Eingabe, rechts das Rechenbeispiel, an dem jede Änderung sofort zu sehen
 * ist. In einer schmalen Spalte steht das Beispiel unter der Eingabe.
 */
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
    <div className="@container">
      <div className="grid @min-[60rem]:grid-cols-[minmax(0,1fr)_34.5rem] @min-[60rem]:gap-x-8 gap-y-7">
        <fieldset className="@container min-w-0">
          <legend className="font-bold text-lg">Gewichtung</legend>
          <p className={`mt-1 max-w-[60ch] ${hintClass}`}>
            Trage ein, was die Lehrkraft verkündet hat, etwa „60:40
            schriftlich:mündlich“ oder „alle Tests zusammen zählen wie eine
            Klausur“.
          </p>
          <div className="mt-4">
            <VerhaeltnisChoice onAction={onAction} verhaeltnis={verhaeltnis} />
          </div>
          {percent === null ? (
            <div>
              <p className={groupTitleClass}>Was eine Note wiegt</p>
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
          <p className="border-line-soft border-t pt-3 text-ink-soft text-sm">
            <span className="font-bold text-ink">So zählt das Fach:</span>{' '}
            {gewichtungsSaetze(state.gewichtung).join(', ')}.
          </p>
        </fieldset>
        <div className="@min-[60rem]:sticky @min-[60rem]:top-24 @min-[60rem]:self-start bg-paper desk:p-5 p-4">
          <CalculationExample gewichtung={state.gewichtung} system={system} />
        </div>
      </div>
    </div>
  );
};
