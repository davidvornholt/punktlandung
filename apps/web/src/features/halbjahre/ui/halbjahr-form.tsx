import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

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
  errorBoxClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sheetClass,
} from '#/shared/ui/form-classes.ts';
import { Segmented } from '#/shared/ui/segmented.tsx';
import { klassenstufeConflictText } from '../errors/halbjahr-errors.ts';
import type { HalbjahrInput } from '../schemas/halbjahr-schema.ts';
import type { KlassenstufeMismatch } from '../services/halbjahr-invariants.ts';
import { findKlassenstufeMismatch } from '../services/halbjahr-invariants.ts';
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

const halves = [
  { label: '1. Halbjahr', value: '1' },
  { label: '2. Halbjahr', value: '2' },
] as const;

type HalbjahrMismatch = KlassenstufeMismatch<Halbjahr> | null;

/** Why the chosen combination cannot be saved; `null` when it can. */
const selectionErrorText = (
  values: HalbjahrFormValues,
  occupied: ReadonlySet<string>,
  mismatch: HalbjahrMismatch,
): string | null => {
  if (isOccupied(occupied, values.schoolYear, values.half)) {
    return `Für ${values.schoolYear} gibt es das ${values.half}. Halbjahr bereits. Wähle eine andere Kombination oder bearbeite den vorhandenen Eintrag.`;
  }
  return mismatch?.kind === 'conflict'
    ? klassenstufeConflictText(mismatch.other)
    : null;
};

/** Says that the other Halbjahr of the school year takes the corrected Klassenstufe too. */
const klassenstufeCorrectionText = (
  values: HalbjahrFormValues,
  mismatch: HalbjahrMismatch,
): string | null =>
  mismatch?.kind === 'correction'
    ? `Die Klassenstufe gilt für das ganze Schuljahr. Beim Speichern wechselt auch das ${mismatch.other.half}. Halbjahr ${mismatch.other.schoolYear} zu ${klassenstufeText(values.klassenstufe)}.`
    : null;

/**
 * What the three choices add up to: the name of the Halbjahr, its dates and
 * the Notensystem every Note in it is counted in. None of the three is
 * entered; they follow from the choices.
 */
const Readout = ({ values }: { readonly values: HalbjahrFormValues }) => (
  <div className="desk:col-start-2 desk:row-span-3 desk:row-start-1 desk:block flex flex-wrap items-center gap-x-6 gap-y-2 desk:self-start border-line-soft border-t desk:border-t-0 desk:border-l desk:pt-0 pt-4 desk:pl-8">
    <p className="font-bold text-4xl">{formatHalbjahrLabel(values)}</p>
    <dl className="desk:mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 desk:gap-y-1 gap-y-0.5">
      <dt className={hintClass}>Schuljahr</dt>
      <dd>{values.schoolYear}</dd>
      <dt className={hintClass}>Beginn</dt>
      <dd>{formatIsoDate(values.startsOn)}</dd>
      <dt className={hintClass}>Ende</dt>
      <dd>{formatIsoDate(values.endsOn)}</dd>
      <dt className={hintClass}>Zählt in</dt>
      <dd>
        {notensystemText(notensystemForKlassenstufe(values.klassenstufe))}
      </dd>
    </dl>
  </div>
);

const HeaderFields = ({
  values,
  schoolYears,
  onUpdate,
}: {
  readonly values: HalbjahrFormValues;
  readonly schoolYears: ReadonlyArray<string>;
  readonly onUpdate: UpdateFields;
}) => (
  // The three fields stand in one line only where the form's column has the
  // room, which the readout beside it decides, not the width of the window.
  <div className="@container desk:col-start-1">
    <div className="grid @[34rem]:grid-cols-[11rem_8.5rem_minmax(0,1fr)] grid-cols-2 gap-4">
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
      <Segmented
        className="@[34rem]:col-span-1 col-span-2 max-w-[17rem]"
        legend="Halbjahr"
        name="halbjahr-half"
        onChange={(half) => onUpdate({ half: half === '2' ? 2 : 1 })}
        options={halves}
        showLegend={true}
        value={values.half === 2 ? '2' : '1'}
      />
    </div>
  </div>
);

const Notices = ({
  correction,
  error,
  selectionError,
}: {
  readonly correction: string | null;
  readonly error: string | null;
  readonly selectionError: string | null;
}) => (
  <>
    {selectionError === null ? null : (
      <p className={`${errorBoxClass} mb-3`} role="alert">
        {selectionError}
      </p>
    )}
    {correction === null ? null : (
      <p
        className="mb-3 border-[1.5px] border-line bg-paper px-3 py-2 text-sm"
        role="status"
      >
        {correction}
      </p>
    )}
    {error === null ? null : (
      <p className={`${errorBoxClass} mb-3`} role="alert">
        {error}
      </p>
    )}
  </>
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
  onValuesChange,
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
  /**
   * Told what the form holds, first when it opens and then with every change,
   * so the time line can show the Halbjahr where its dates put it. Pass a
   * function that stays the same between renders.
   */
  readonly onValuesChange?: (values: HalbjahrFormValues) => void;
}) => {
  const [values, setValues] = useState<HalbjahrFormValues>(() =>
    halbjahrFormValues(halbjahr, halbjahre, today),
  );
  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);
  const updateValue: UpdateFields = (part) =>
    setValues((previous) => withUpdatedDateRange({ ...previous, ...part }));

  const mismatch = findKlassenstufeMismatch(halbjahre, {
    ...values,
    id: halbjahr?.id ?? null,
  });
  const selectionError = selectionErrorText(
    values,
    occupiedHalbjahre(halbjahre, halbjahr),
    mismatch,
  );

  return (
    <form
      className={`${sheetClass} mb-6 animate-eases-in desk:p-6 p-4`}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || selectionError !== null) {
          return;
        }
        onSave(toHalbjahrInput(values));
      }}
      ref={formRef}
    >
      <h3 className="font-bold text-lg">{title}</h3>
      <div className="mt-4 grid desk:grid-cols-[minmax(0,1fr)_17rem] grid-cols-1 desk:grid-rows-[auto_auto_1fr] desk:gap-x-8 gap-y-4">
        <HeaderFields
          onUpdate={updateValue}
          schoolYears={schoolYearOptions(
            today,
            halbjahre.map((entry) => entry.schoolYear),
          )}
          values={values}
        />
        <Readout values={values} />
        <HalbjahrDateRangeField
          onUpdate={updateValue}
          today={today}
          values={values}
        />
        <div className="desk:col-start-1 desk:self-end">
          <Notices
            correction={
              selectionError === null
                ? klassenstufeCorrectionText(values, mismatch)
                : null
            }
            error={error}
            selectionError={selectionError}
          />
          <div className="mt-1 flex flex-wrap gap-3">
            <button
              aria-busy={pending}
              aria-disabled={pending || selectionError !== null}
              className={primaryButtonClass}
              type="submit"
            >
              {pending ? 'Halbjahr wird gespeichert …' : 'Halbjahr speichern'}
            </button>
            <button
              className={secondaryButtonClass}
              disabled={pending}
              onClick={onCancel}
              type="button"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
