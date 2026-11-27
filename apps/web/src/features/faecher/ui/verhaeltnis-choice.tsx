import { useId } from 'react';

import {
  gewichtungLimits,
  standardverhaeltnis,
} from '#/shared/noten/fach-gewichtung.ts';
import { verhaeltnisProzentText } from '#/shared/noten/gewichtung-text.ts';
import type { Bereichsverhaeltnis } from '#/shared/noten/notenwert.ts';
import {
  buttonClass,
  hintClass,
  inputClass,
} from '#/shared/ui/form-classes.ts';
import { Radio } from '#/shared/ui/form-controls.tsx';
import { VerhaeltnisBar } from './gewichtung-figure.tsx';
import type { GewichtungAction } from './gewichtung-model.ts';

/**
 * Die Verhältnisse, die Lehrkräfte am häufigsten verkünden: erst die in
 * Teilen, dann die in Prozent. Wo nicht alle in eine Zeile passen, bleibt
 * jede der beiden Gruppen beisammen.
 */
const quickChoices: ReadonlyArray<ReadonlyArray<Bereichsverhaeltnis>> = [
  [
    { schriftlich: 1, muendlich: 1 },
    { schriftlich: 2, muendlich: 1 },
    { schriftlich: 3, muendlich: 1 },
  ],
  [
    { schriftlich: 60, muendlich: 40 },
    { schriftlich: 70, muendlich: 30 },
  ],
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
  <label className="block w-20 [&>input]:mt-0">
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
 * in zwei Maßstäben — beide werden hier unverändert eingetragen. Die
 * Beschreibungen nennen den Unterschied, an dem sich der Schnitt entscheidet:
 * ob die Zahl der Noten den Anteil eines Bereichs bestimmt oder nicht.
 */
const listeDescription =
  'Jede Note zählt mit ihrem Gewicht; wie viel schriftlich und mündlich ausmachen, ergibt sich aus der Zahl der Noten. Typisch: „Klausuren zählen doppelt“.';
const verhaeltnisDescription =
  'Schriftlich und mündlich werden getrennt gemittelt und dann im verkündeten Verhältnis verrechnet – egal, wie viele Noten es jeweils gibt. Typisch: „60:40“.';

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
    <div className="space-y-3.5">
      <Radio
        checked={verhaeltnis === null}
        description={listeDescription}
        name="aufteilung"
        onSelect={() => onAction({ type: 'ratio', verhaeltnis: null })}
      >
        Alle Noten in einer Liste
      </Radio>
      <div className="space-y-3">
        <Radio
          checked={verhaeltnis !== null}
          description={verhaeltnisDescription}
          name="aufteilung"
          onSelect={() =>
            onAction({ type: 'ratio', verhaeltnis: standardverhaeltnis })
          }
        >
          Festes Verhältnis schriftlich : mündlich
        </Radio>
        {verhaeltnis === null ? null : (
          <div className="@container ml-[1.75rem] animate-eases-in space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <ShareField
                bereich="schriftlich"
                errorId={describedBy}
                invalid={invalid}
                onAction={onAction}
                value={verhaeltnis.schriftlich}
              />
              <span aria-hidden={true} className="font-bold">
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
                  className="font-bold text-critical text-sm"
                  id={errorId}
                  role="alert"
                >
                  Mindestens ein Bereich muss zählen.
                </span>
              ) : (
                <span className={hintClass}>
                  ≙ {verhaeltnisProzentText(verhaeltnis)}
                </span>
              )}
            </div>
            <div className="max-w-[20rem]">
              <VerhaeltnisBar verhaeltnis={verhaeltnis} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Where the choices need two lines, their label stands above them. */}
              <span className={`${hintClass} mr-1 @max-[24rem]:basis-full`}>
                Häufig:
              </span>
              {quickChoices.map((group) => (
                <span
                  className="flex gap-1.5"
                  key={group.map(formatVerhaeltnis).join(' ')}
                >
                  {group.map((choice) => (
                    <button
                      className={buttonClass('secondary', 'compact')}
                      key={formatVerhaeltnis(choice)}
                      onClick={() =>
                        onAction({ type: 'ratio', verhaeltnis: choice })
                      }
                      type="button"
                    >
                      {formatVerhaeltnis(choice)}
                    </button>
                  ))}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
