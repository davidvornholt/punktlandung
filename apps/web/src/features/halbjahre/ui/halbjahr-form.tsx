import type { RefObject } from 'react';
import { useState } from 'react';

import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import {
  formatHalbjahrLabel,
  isKlassenstufe,
  klassenstufen,
  klassenstufeText,
  notensystemForKlassenstufe,
} from '#/shared/school/klassenstufe.ts';
import { schoolYearOptions } from '#/shared/school/school-year.ts';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import type { HalbjahrInput } from '../schemas/halbjahr-schema.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';
import { HalbjahrDateRangeField } from './halbjahr-date-range-field.tsx';
import type { HalbjahrFormValues } from './halbjahr-form-model.ts';
import {
  halbjahrFormValues,
  isOccupied,
  occupiedHalbjahre,
  toHalbjahrInput,
  withUpdatedDateRange,
} from './halbjahr-form-model.ts';

type UpdateFields = (part: Partial<HalbjahrFormValues>) => void;

const formatHalbjahrNumber = (number: 1 | 2) =>
  number === 1 ? '1. Halbjahr (Aug–Jan)' : '2. Halbjahr (Feb–Jul)';

const Summary = ({ values }: { readonly values: HalbjahrFormValues }) => (
  <p className="mt-4 border border-border bg-surface-sunken px-3 py-2 text-ink-muted text-sm">
    <span className="font-semibold text-ink">
      {formatHalbjahrLabel(values)}
    </span>{' '}
    · Schuljahr {values.schoolYear} · {formatIsoDate(values.startsOn)} bis{' '}
    {formatIsoDate(values.endsOn)} ·{' '}
    {notensystemText(notensystemForKlassenstufe(values.klassenstufe))}
  </p>
);

const HeaderFields = ({
  values,
  occupied,
  schoolYears,
  onUpdate,
}: {
  readonly values: HalbjahrFormValues;
  readonly occupied: ReadonlySet<string>;
  readonly schoolYears: ReadonlyArray<string>;
  readonly onUpdate: UpdateFields;
}) => (
  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <label className={labelClass}>
      Klassenstufe
      <select
        className={inputClass}
        onChange={(event) => {
          const selected = event.target.value;
          if (isKlassenstufe(selected)) {
            onUpdate({ klassenstufe: selected });
          }
        }}
        value={values.klassenstufe}
      >
        {klassenstufen.map((klassenstufe) => (
          <option key={klassenstufe} value={klassenstufe}>
            {klassenstufeText(klassenstufe)}
          </option>
        ))}
      </select>
    </label>
    <label className={labelClass}>
      Schuljahr
      <select
        className={inputClass}
        onChange={(event) => onUpdate({ schoolYear: event.target.value })}
        value={values.schoolYear}
      >
        {schoolYears.map((schoolYear) => (
          <option key={schoolYear} value={schoolYear}>
            {schoolYear}
          </option>
        ))}
      </select>
    </label>
    <label className={labelClass}>
      Halbjahr
      <select
        className={inputClass}
        onChange={(event) =>
          onUpdate({ number: event.target.value === '2' ? 2 : 1 })
        }
        value={values.number}
      >
        {([1, 2] as const).map((number) => (
          <option key={number} value={number}>
            {formatHalbjahrNumber(number)}
            {isOccupied(occupied, values.schoolYear, number)
              ? ' — schon angelegt'
              : ''}
          </option>
        ))}
      </select>
    </label>
  </div>
);

export const HalbjahrForm = ({
  title,
  halbjahr,
  halbjahre,
  today,
  pending,
  error,
  formRef,
  onSave,
  onCancel,
}: {
  readonly title: string;
  readonly halbjahr: Halbjahr | null;
  readonly halbjahre: ReadonlyArray<Halbjahr>;
  readonly today: string;
  readonly pending: boolean;
  readonly error: string | null;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly onSave: (values: HalbjahrInput) => void;
  readonly onCancel: () => void;
}) => {
  const [values, setValues] = useState<HalbjahrFormValues>(() =>
    halbjahrFormValues(halbjahr, halbjahre, today),
  );
  const updateValue: UpdateFields = (part) =>
    setValues((previous) => withUpdatedDateRange({ ...previous, ...part }));

  const occupied = occupiedHalbjahre(halbjahre, halbjahr);
  const schoolYears = schoolYearOptions(
    today,
    halbjahre.map((entry) => entry.schoolYear),
  );
  const alreadyOccupied = isOccupied(
    occupied,
    values.schoolYear,
    values.number,
  );

  return (
    <form
      className="border border-border bg-surface p-5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(toHalbjahrInput(values));
      }}
      ref={formRef}
    >
      <h3 className="font-display text-ink text-xl tracking-tight">{title}</h3>
      <HeaderFields
        occupied={occupied}
        onUpdate={updateValue}
        schoolYears={schoolYears}
        values={values}
      />
      <Summary values={values} />
      {alreadyOccupied ? (
        <p
          className="mt-2 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          Für {values.schoolYear} gibt es das {values.number}. Halbjahr bereits.
          Wähle eine andere Kombination oder bearbeite den vorhandenen Eintrag.
        </p>
      ) : null}
      <div className="mt-4">
        <HalbjahrDateRangeField onUpdate={updateValue} values={values} />
      </div>
      {error === null ? null : (
        <p
          className="mt-4 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button
          className={primaryButtonClass}
          disabled={pending || alreadyOccupied}
          type="submit"
        >
          {pending ? 'Halbjahr wird gespeichert …' : 'Halbjahr speichern'}
        </button>
        <button
          className={secondaryButtonClass}
          onClick={onCancel}
          type="button"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
};
