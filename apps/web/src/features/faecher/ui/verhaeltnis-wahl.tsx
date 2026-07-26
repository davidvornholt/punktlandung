import { useId } from 'react';

import {
  gewichtungsGrenzen,
  standardverhaeltnis,
} from '#/shared/noten/fach-gewichtung.ts';
import { verhaeltnisProzentText } from '#/shared/noten/gewichtung-text.ts';
import type { Bereichsverhaeltnis } from '#/shared/noten/notenwert.ts';
import { inputClass, quietButtonClass } from '#/shared/ui/form-classes.ts';
import { Radio } from '#/shared/ui/form-controls.tsx';
import type { GewichtungAction } from './gewichtung-modell.ts';

/** Die Verhältnisse, die Lehrkräfte am häufigsten verkünden. */
const schnellwahl: ReadonlyArray<Bereichsverhaeltnis> = [
  { schriftlich: 1, muendlich: 1 },
  { schriftlich: 2, muendlich: 1 },
  { schriftlich: 3, muendlich: 1 },
  { schriftlich: 60, muendlich: 40 },
  { schriftlich: 70, muendlich: 30 },
];

const verhaeltnisText = (verhaeltnis: Bereichsverhaeltnis): string =>
  `${verhaeltnis.schriftlich}:${verhaeltnis.muendlich}`;

const Anteilsfeld = ({
  bereich,
  errorId,
  invalid,
  wert,
  onAktion,
}: {
  readonly bereich: 'schriftlich' | 'muendlich';
  readonly errorId: string | undefined;
  readonly invalid: boolean;
  readonly wert: number;
  readonly onAktion: (aktion: GewichtungAction) => void;
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
      max={gewichtungsGrenzen.anteilMax}
      min={0}
      name={`anteil-${bereich}`}
      onChange={(ereignis) =>
        onAktion({
          typ: 'anteil',
          bereich,
          wert: Number(ereignis.currentTarget.value),
        })
      }
      step={1}
      type="number"
      value={wert}
    />
  </label>
);

/**
 * Die Verkündung der Lehrkraft: entweder eine gemeinsame Liste oder ein
 * Verhältnis schriftlich zu mündlich. "3:1" und "60:40" sind dieselbe Angabe
 * in zwei Maßstäben — beide werden hier unverändert eingetragen.
 */
export const VerhaeltnisWahl = ({
  verhaeltnis,
  onAktion,
}: {
  readonly verhaeltnis: Bereichsverhaeltnis | null;
  readonly onAktion: (aktion: GewichtungAction) => void;
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
        onSelect={() => onAktion({ typ: 'aufteilung', verhaeltnis: null })}
      >
        Eine gemeinsame Liste
      </Radio>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Radio
          checked={verhaeltnis !== null}
          name="aufteilung"
          onSelect={() =>
            onAktion({ typ: 'aufteilung', verhaeltnis: standardverhaeltnis })
          }
        >
          Schriftlich : mündlich
        </Radio>
        {verhaeltnis === null ? null : (
          <>
            <Anteilsfeld
              bereich="schriftlich"
              errorId={describedBy}
              invalid={invalid}
              onAktion={onAktion}
              wert={verhaeltnis.schriftlich}
            />
            <span aria-hidden={true} className="text-ink-muted">
              :
            </span>
            <Anteilsfeld
              bereich="muendlich"
              errorId={describedBy}
              invalid={invalid}
              onAktion={onAktion}
              wert={verhaeltnis.muendlich}
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
          {schnellwahl.map((wahl) => (
            <button
              className={quietButtonClass}
              key={verhaeltnisText(wahl)}
              onClick={() => onAktion({ typ: 'aufteilung', verhaeltnis: wahl })}
              type="button"
            >
              {verhaeltnisText(wahl)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
