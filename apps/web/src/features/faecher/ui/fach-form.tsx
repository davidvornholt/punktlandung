import type { RefObject } from 'react';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import type { FachFields } from '../schemas/fach-schema.ts';
import { fachLimits } from '../schemas/fach-schema.ts';
import type { Fach } from '../services/fach-service.ts';
import { fachFormValues } from './fach-form-model.ts';

const gewichtungFields = [
  { name: 'klausurGewichtung', label: 'Klausur' },
  { name: 'testGewichtung', label: 'Test' },
  { name: 'muendlichGewichtung', label: 'Mündlich' },
  { name: 'gfsGewichtung', label: 'GFS' },
  { name: 'sonstigeGewichtung', label: 'Sonstige' },
] as const;

const readValues = (form: HTMLFormElement): FachFields => {
  const data = new FormData(form);
  const text = (name: string) => `${data.get(name) ?? ''}`.trim();
  const parseGewichtung = (name: string) => {
    const raw = text(name).replace(',', '.');
    return raw === '' ? 1 : Number(raw);
  };
  const share = text('schriftlichShare');
  return {
    name: text('name'),
    shortName: text('shortName'),
    schriftlichShare: share === '' ? null : Number(share),
    klausurGewichtung: parseGewichtung('klausurGewichtung'),
    testGewichtung: parseGewichtung('testGewichtung'),
    muendlichGewichtung: parseGewichtung('muendlichGewichtung'),
    gfsGewichtung: parseGewichtung('gfsGewichtung'),
    sonstigeGewichtung: parseGewichtung('sonstigeGewichtung'),
  };
};

export const FachForm = ({
  title,
  fach,
  pending,
  error,
  formRef,
  onSave,
  onCancel,
}: {
  readonly title: string;
  readonly fach: Fach | null;
  readonly pending: boolean;
  readonly error: string | null;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly onSave: (values: FachFields) => void;
  readonly onCancel: () => void;
}) => {
  const values = fachFormValues(fach);
  return (
    <form
      className="border border-border bg-surface p-5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(readValues(event.currentTarget));
      }}
      ref={formRef}
    >
      <h3 className="font-display text-ink text-xl tracking-tight">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <label className={labelClass}>
          Name
          <input
            className={inputClass}
            defaultValue={values.name}
            maxLength={fachLimits.nameMax}
            name="name"
            required={true}
          />
        </label>
        <label className={labelClass}>
          Kürzel
          <input
            className={inputClass}
            defaultValue={values.shortName}
            maxLength={fachLimits.maxShortName}
            name="shortName"
            required={true}
          />
        </label>
      </div>
      <fieldset className="mt-5 border border-border p-4">
        <legend className={`${labelClass} px-1`}>
          Gewichtung je Leistungsart
        </legend>
        <p className="text-ink-muted text-sm">
          Gewichtung wie von der Lehrkraft verkündet, z. B. Klausuren doppelt:
          Klausur 2, alles andere 1.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {gewichtungFields.map((field) => (
            <label className={labelClass} key={field.name}>
              {field.label}
              <input
                className={inputClass}
                defaultValue={values[field.name]}
                inputMode="decimal"
                max={fachLimits.maxGewichtung}
                min={fachLimits.gewichtungStep}
                name={field.name}
                step={fachLimits.gewichtungStep}
                type="number"
              />
            </label>
          ))}
        </div>
        <label className={`${labelClass} mt-4`}>
          Schriftlicher Anteil in Prozent (optional)
          <input
            className={inputClass}
            defaultValue={values.schriftlichShare}
            inputMode="numeric"
            max={fachLimits.maxShare}
            min={0}
            name="schriftlichShare"
            step={1}
            type="number"
          />
        </label>
        <p className="mt-2 text-ink-faint text-sm">
          Leer lassen, wenn die Lehrkraft keine schriftlich/mündlich-Aufteilung
          verkündet hat — dann zählt eine gemeinsame gewichtete Liste.
        </p>
      </fieldset>
      {error === null ? null : (
        <p
          className="mt-4 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button className={primaryButtonClass} disabled={pending} type="submit">
          {pending ? 'Fach wird gespeichert …' : 'Fach speichern'}
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
