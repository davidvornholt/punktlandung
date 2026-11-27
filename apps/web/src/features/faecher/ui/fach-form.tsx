import type { RefObject } from 'react';
import { useReducer } from 'react';

import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
import {
  errorBoxClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sheetClass,
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
  scope,
  fach,
  system,
  pending,
  error,
  formRef,
  onSave,
  onCancel,
}: {
  readonly title: string;
  /** Says under the title what the entries apply to, such as the Schuljahr. */
  readonly scope?: string;
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
      className={`${sheetClass} animate-eases-in desk:p-7 p-4`}
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !pending) {
          onSave(readValues(event.currentTarget, state.gewichtung));
        }
      }}
      ref={formRef}
    >
      <h3 className="font-bold text-xl">{title}</h3>
      {scope === undefined ? null : (
        <p className={`mt-1 ${hintClass}`}>{scope}</p>
      )}
      <div className="mt-4 grid max-w-[36rem] grid-cols-[minmax(0,1fr)_6.5rem] gap-4">
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
      <div className="mt-7 border-line border-t pt-6">
        <GewichtungField onAction={dispatch} state={state} system={system} />
      </div>
      {error === null ? null : (
        <p className={`${errorBoxClass} mt-6`} role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          className={primaryButtonClass}
          aria-disabled={pending || !valid}
          aria-busy={pending}
          type="submit"
        >
          {pending ? 'Fach wird gespeichert …' : 'Fach speichern'}
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
    </form>
  );
};
