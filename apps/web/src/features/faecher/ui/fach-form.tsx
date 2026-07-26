import type { RefObject } from 'react';
import { useReducer } from 'react';

import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
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
import { GewichtungField } from './gewichtung-field.tsx';
import {
  gewichtungReducer,
  gewichtungStateFrom,
  isVerhaeltnisValid,
} from './gewichtung-model.ts';

const readValues = (
  form: HTMLFormElement,
  gewichtung: Fachgewichtung,
): FachFields => {
  const data = new FormData(form);
  const text = (name: string) => `${data.get(name) ?? ''}`.trim();
  return {
    name: text('name'),
    shortName: text('shortName'),
    gewichtung,
  };
};

export const FachForm = ({
  title,
  fach,
  system,
  pending,
  error,
  formRef,
  onSave,
  onCancel,
}: {
  readonly title: string;
  readonly fach: Fach | null;
  readonly system: Notensystem;
  readonly pending: boolean;
  readonly error: string | null;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly onSave: (values: FachFields) => void;
  readonly onCancel: () => void;
}) => {
  const values = fachFormValues(fach);
  const [state, dispatch] = useReducer(
    gewichtungReducer,
    values.gewichtung,
    gewichtungStateFrom,
  );
  const valid = isVerhaeltnisValid(state.gewichtung);
  return (
    <form
      className="border border-border bg-surface p-5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          onSave(readValues(event.currentTarget, state.gewichtung));
        }
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
      <GewichtungField onAction={dispatch} state={state} system={system} />
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
          disabled={pending || !valid}
          type="submit"
        >
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
