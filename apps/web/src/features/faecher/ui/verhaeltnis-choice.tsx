import { useId } from 'react';

import {
  gewichtungLimits,
  standardverhaeltnis,
} from '#/shared/noten/fach-gewichtung.ts';
import { verhaeltnisProzentText } from '#/shared/noten/gewichtung-text.ts';
import type { Bereichsverhaeltnis } from '#/shared/noten/notenwert.ts';
import { inputClass, quietButtonClass } from '#/shared/ui/form-classes.ts';
import { Radio } from '#/shared/ui/form-controls.tsx';
import type { GewichtungAction } from './gewichtung-model.ts';

/** Die Verhältnisse, die Lehrkräfte am häufigsten verkünden. */
const quickChoices: ReadonlyArray<Bereichsverhaeltnis> = [
  { schriftlich: 1, muendlich: 1 },
  { schriftlich: 2, muendlich: 1 },
  { schriftlich: 3, muendlich: 1 },
  { schriftlich: 60, muendlich: 40 },
  { schriftlich: 70, muendlich: 30 },
];

const formatVerhaeltnis = (verhaeltnis: Bereichsverhaeltnis): string =>
  `${verhaeltnis.schriftlich}:${verhaeltnis.muendlich}`;

const ShareField = ({
  bereich,
  errorId,
  invalid,
  value,
  onAction,
}: {
  readonly bereich: 'schriftlich' | 'muendlich';
  readonly errorId: string | undefined;
  readonly invalid: boolean;
  readonly value: number;
  readonly onAction: (action: GewichtungAction) => void;
}) => (
  <label className="block w-20">
    <span className="sr-only">
      {bereich === 'schriftlich' ? 'Schriftlicher' : 'Mündlicher'} Anteil
    </span>
    <input
      aria-describedby={errorId}
      aria-invalid={invalid}
      className={inputClass}
      inputMode="numeric"
      max={gewichtungLimits.maxShare}
      min={0}
      name={`anteil-${bereich}`}
      onChange={(event) =>
        onAction({
          type: 'share',
          bereich,
          value: Number(event.currentTarget.value),
        })
      }
      step={1}
      type="number"
      value={value}
    />
  </label>
);

/**
 * Die Verkündung der Lehrkraft: entweder eine gemeinsame Liste oder ein
 * Verhältnis schriftlich zu mündlich. "3:1" und "60:40" sind dieselbe Angabe
 * in zwei Maßstäben — beide werden hier unverändert eingetragen.
 */
export const VerhaeltnisChoice = ({
  verhaeltnis,
  onAction,
}: {
  readonly verhaeltnis: Bereichsverhaeltnis | null;
  readonly onAction: (action: GewichtungAction) => void;
}) => {
  const errorId = useId();
  const invalid =
    verhaeltnis !== null &&
    verhaeltnis.schriftlich + verhaeltnis.muendlich <= 0;
  const describedBy = invalid ? errorId : undefined;
  return (
    <div className="space-y-2">
      <Radio
        checked={verhaeltnis === null}
        name="aufteilung"
        onSelect={() => onAction({ type: 'ratio', verhaeltnis: null })}
      >
        Eine gemeinsame Liste
      </Radio>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Radio
          checked={verhaeltnis !== null}
          name="aufteilung"
          onSelect={() =>
            onAction({ type: 'ratio', verhaeltnis: standardverhaeltnis })
          }
        >
          Schriftlich : mündlich
        </Radio>
        {verhaeltnis === null ? null : (
          <>
            <ShareField
              bereich="schriftlich"
              errorId={describedBy}
              invalid={invalid}
              onAction={onAction}
              value={verhaeltnis.schriftlich}
            />
            <span aria-hidden={true} className="text-ink-muted">
              :
            </span>
            <ShareField
              bereich="muendlich"
              errorId={describedBy}
              invalid={invalid}
              onAction={onAction}
              value={verhaeltnis.muendlich}
            />
            {invalid ? (
              <span
                className="text-ink-muted text-sm"
                id={errorId}
                role="alert"
              >
                Mindestens ein Bereich muss zählen.
              </span>
            ) : (
              <span className="text-ink-muted text-sm">
                ≙ {verhaeltnisProzentText(verhaeltnis)}
              </span>
            )}
          </>
        )}
      </div>
      {verhaeltnis === null ? null : (
        <div className="flex flex-wrap items-center gap-x-3 text-sm">
          <span className="text-ink-faint">Häufig:</span>
          {quickChoices.map((choice) => (
            <button
              className={quietButtonClass}
              key={formatVerhaeltnis(choice)}
              onClick={() => onAction({ type: 'ratio', verhaeltnis: choice })}
              type="button"
            >
              {formatVerhaeltnis(choice)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
