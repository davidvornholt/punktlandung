import {
  eingabeKlasse,
  labelKlasse,
  leiseKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { HalbjahrFormWerte } from './halbjahr-form-modell.ts';

/**
 * Der Zeitraum folgt standardmäßig den amtlichen Halbjahresgrenzen und wird
 * erst auf ausdrücklichen Wunsch zum Eingabefeld. Der Umschalter bleibt dabei
 * stehen, damit die Tastaturbedienung ihre Position nicht verliert.
 */
export const HalbjahrZeitraumFeld = ({
  werte,
  onAendern,
}: {
  readonly werte: HalbjahrFormWerte;
  readonly onAendern: (teil: Partial<HalbjahrFormWerte>) => void;
}) => (
  <div>
    <button
      aria-expanded={werte.zeitraumAngepasst}
      className={leiseKnopfKlasse}
      onClick={() => onAendern({ zeitraumAngepasst: !werte.zeitraumAngepasst })}
      type="button"
    >
      {werte.zeitraumAngepasst
        ? 'Amtlichen Zeitraum wiederherstellen'
        : 'Zeitraum abweichend festlegen'}
    </button>
    {werte.zeitraumAngepasst ? (
      <fieldset className="mt-3 border border-border px-4 pt-2 pb-4">
        <legend className="px-1 text-ink-muted text-xs uppercase tracking-widest">
          Abweichender Zeitraum
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelKlasse}>
            Beginn
            <input
              className={eingabeKlasse}
              onChange={(ereignis) =>
                onAendern({ startsOn: ereignis.target.value })
              }
              required={true}
              type="date"
              value={werte.startsOn}
            />
          </label>
          <label className={labelKlasse}>
            Ende
            <input
              className={eingabeKlasse}
              onChange={(ereignis) =>
                onAendern({ endsOn: ereignis.target.value })
              }
              required={true}
              type="date"
              value={werte.endsOn}
            />
          </label>
        </div>
      </fieldset>
    ) : null}
  </div>
);
