import { gewichtungLimits } from '#/shared/noten/fach-gewichtung.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import type { Artgewichtung, Leistungsart } from '#/shared/noten/notenwert.ts';
import { inputClass } from '#/shared/ui/form-classes.ts';
import { Checkbox, Radio } from '#/shared/ui/form-controls.tsx';
import type { GewichtungAction } from './gewichtung-model.ts';

/**
 * Was eine Leistungsart im Formular anbietet. Der Bereich fehlt bewusst: er
 * gehört zur Art, nicht zur Verkündung — ein Test ist eine schriftliche
 * Arbeit, auch wenn die Lehrkraft ihn zu den mündlichen Noten zählt.
 *
 * Nur die Vorbilder tragen `wirkt`: eine eben entkoppelte Art steht ihrem
 * Bereich per Definition unabhängig gegenüber, ihr Gewicht wirkt also immer.
 */
export type RowControl =
  | { readonly type: 'weight'; readonly effective: boolean }
  | {
      readonly type: 'coupling';
      readonly kind: 'gfs' | 'sonstige';
      readonly text: string;
      readonly active: boolean;
    }
  | { readonly type: 'collection'; readonly coupled: boolean };

const choiceClass = 'flex items-center gap-2 text-ink text-sm';

const GewichtungInput = ({
  kind,
  art,
  onAction,
}: {
  readonly kind: Leistungsart;
  readonly art: Artgewichtung;
  readonly onAction: (action: GewichtungAction) => void;
}) => (
  <label className={`${choiceClass} text-ink-muted`}>
    <span aria-hidden={true}>Gewicht ×</span>
    <span className="block w-20">
      <input
        aria-label={`Gewicht für ${leistungsartLabel[kind]}`}
        className={inputClass}
        inputMode="decimal"
        max={gewichtungLimits.maxGewichtung}
        min={gewichtungLimits.gewichtungStep}
        name={`gewicht-${kind}`}
        onChange={(event) =>
          onAction({
            type: 'weight',
            kind,
            value: Number(event.currentTarget.value),
          })
        }
        step={gewichtungLimits.gewichtungStep}
        type="number"
        value={art.gewicht}
      />
    </span>
  </label>
);

/** Die Testregel als Verkündung: gesammelt wie eine Klausur oder einzeln. */
const SammlungChoice = ({
  art,
  coupled,
  onAction,
}: {
  readonly art: Artgewichtung;
  readonly coupled: boolean;
  readonly onAction: (action: GewichtungAction) => void;
}) => (
  <fieldset className="space-y-2">
    <legend className="sr-only">Sammlung für Test</legend>
    <Radio
      checked={coupled}
      name="sammlung-test"
      onSelect={() =>
        onAction({ type: 'coupling', kind: 'test', coupled: true })
      }
    >
      Alle Tests zusammen zählen wie eine Klausur
    </Radio>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Radio
        checked={!coupled}
        name="sammlung-test"
        onSelect={() =>
          onAction({ type: 'coupling', kind: 'test', coupled: false })
        }
      >
        Jeder Test zählt einzeln
      </Radio>
      {coupled ? null : (
        <GewichtungInput art={art} kind="test" onAction={onAction} />
      )}
    </div>
  </fieldset>
);

const Control = ({
  kind,
  art,
  control,
  onAction,
}: {
  readonly kind: Leistungsart;
  readonly art: Artgewichtung;
  readonly control: RowControl;
  readonly onAction: (action: GewichtungAction) => void;
}) => {
  if (control.type === 'collection') {
    return (
      <SammlungChoice art={art} coupled={control.coupled} onAction={onAction} />
    );
  }
  if (control.type === 'weight') {
    return control.effective ? (
      <GewichtungInput art={art} kind={kind} onAction={onAction} />
    ) : null;
  }
  return (
    <>
      <Checkbox
        checked={control.active}
        onChange={(coupled) =>
          onAction({ type: 'coupling', kind: control.kind, coupled })
        }
      >
        {control.text}
      </Checkbox>
      {control.active ? null : (
        <GewichtungInput art={art} kind={kind} onAction={onAction} />
      )}
    </>
  );
};

/** Eine Leistungsart im Gewichtungsfeld. */
export const GewichtungRow = ({
  kind,
  art,
  control,
  onAction,
}: {
  readonly kind: Leistungsart;
  readonly art: Artgewichtung;
  readonly control: RowControl;
  readonly onAction: (action: GewichtungAction) => void;
}) => (
  <fieldset className="border-border border-t py-3 first:border-t-0">
    <legend className="sr-only">{leistungsartLabel[kind]}</legend>
    <div className="sm:grid sm:grid-cols-[7rem_1fr] sm:gap-4">
      <p aria-hidden={true} className="font-semibold text-ink text-sm">
        {leistungsartLabel[kind]}
      </p>
      <div className="mt-2 space-y-2 sm:mt-0">
        <Control art={art} control={control} kind={kind} onAction={onAction} />
      </div>
    </div>
  </fieldset>
);
