import { CalendarRange, Undo2 } from 'lucide-react';

import { addDays } from '#/shared/date/date-text.ts';
import { DateField } from '#/shared/ui/date-field.tsx';
import { iconSize, iconStroke } from '#/shared/ui/icon.ts';
import type { HalbjahrFormValues } from './halbjahr-form-model.ts';

/**
 * The switch is a line of text flush with the fields above it, not a button
 * with a box of its own: it changes what the form asks, not what is saved.
 */
const switchClass =
  'inline-flex min-h-9 items-center gap-2 text-sm underline-offset-[3px] hover:underline';

/**
 * The dates follow the official bounds of the Halbjahr and become fields only
 * when asked for. The switch stays where it is while they open, so the
 * keyboard does not lose its place. Each field ends where the other begins:
 * a Halbjahr that ends before it starts cannot be chosen.
 */
export const HalbjahrDateRangeField = ({
  onUpdate,
  today,
  values,
}: {
  readonly onUpdate: (part: Partial<HalbjahrFormValues>) => void;
  /** ISO date. */
  readonly today: string;
  readonly values: HalbjahrFormValues;
}) => (
  <div className="@container desk:col-start-1">
    <button
      aria-expanded={values.dateRangeAdjusted}
      className={switchClass}
      onClick={() => onUpdate({ dateRangeAdjusted: !values.dateRangeAdjusted })}
      type="button"
    >
      {values.dateRangeAdjusted ? (
        <Undo2 aria-hidden={true} size={iconSize} strokeWidth={iconStroke} />
      ) : (
        <CalendarRange
          aria-hidden={true}
          size={iconSize}
          strokeWidth={iconStroke}
        />
      )}
      {values.dateRangeAdjusted
        ? 'Amtlichen Zeitraum wiederherstellen'
        : 'Zeitraum abweichend festlegen'}
    </button>
    {values.dateRangeAdjusted ? (
      <fieldset className="mt-2 animate-eases-in">
        <legend className="sr-only">Abweichender Zeitraum</legend>
        <div className="grid @[34rem]:grid-cols-2 grid-cols-1 gap-4">
          <DateField
            label="Beginn"
            max={addDays(values.endsOn, -1)}
            onChange={(startsOn) => onUpdate({ startsOn })}
            today={today}
            value={values.startsOn}
          />
          <DateField
            label="Ende"
            min={addDays(values.startsOn, 1)}
            onChange={(endsOn) => onUpdate({ endsOn })}
            today={today}
            value={values.endsOn}
          />
        </div>
      </fieldset>
    ) : null}
  </div>
);
