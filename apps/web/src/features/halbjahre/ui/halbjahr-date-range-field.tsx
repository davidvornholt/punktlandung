import {
  inputClass,
  labelClass,
  quietButtonClass,
} from '#/shared/ui/form-classes.ts';
import type { HalbjahrFormValues } from './halbjahr-form-model.ts';

/**
 * Der Zeitraum folgt standardmäßig den amtlichen Halbjahresgrenzen und wird
 * erst auf ausdrücklichen Wunsch zum Eingabefeld. Der Umschalter bleibt dabei
 * stehen, damit die Tastaturbedienung ihre Position nicht verliert.
 */
export const HalbjahrDateRangeField = ({
  values,
  onUpdate,
}: {
  readonly values: HalbjahrFormValues;
  readonly onUpdate: (part: Partial<HalbjahrFormValues>) => void;
}) => (
  <div>
    <button
      aria-expanded={values.dateRangeAdjusted}
      className={quietButtonClass}
      onClick={() => onUpdate({ dateRangeAdjusted: !values.dateRangeAdjusted })}
      type="button"
    >
      {values.dateRangeAdjusted
        ? 'Amtlichen Zeitraum wiederherstellen'
        : 'Zeitraum abweichend festlegen'}
    </button>
    {values.dateRangeAdjusted ? (
      <fieldset className="mt-3 border border-border px-4 pt-2 pb-4">
        <legend className="px-1 text-ink-muted text-xs uppercase tracking-widest">
          Abweichender Zeitraum
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Beginn
            <input
              className={inputClass}
              onChange={(event) => onUpdate({ startsOn: event.target.value })}
              required={true}
              type="date"
              value={values.startsOn}
            />
          </label>
          <label className={labelClass}>
            Ende
            <input
              className={inputClass}
              onChange={(event) => onUpdate({ endsOn: event.target.value })}
              required={true}
              type="date"
              value={values.endsOn}
            />
          </label>
        </div>
      </fieldset>
    ) : null}
  </div>
);
