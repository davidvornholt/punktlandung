import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { clampIsoDate } from '#/shared/date/date-range.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import type { NoteInput } from '../schemas/note-schema.ts';
import { notenLimits } from '../schemas/note-schema.ts';
import { createNoteFn } from '../server/noten-fns.ts';
import { leistungsartLabel } from './leistungsart-label.ts';

const readValues = (form: HTMLFormElement, halbjahrId: string): NoteInput => {
  const data = new FormData(form);
  const text = (name: string) => `${data.get(name) ?? ''}`.trim();
  const wertungsbereich = text('wertungsbereich');
  const comment = text('comment');
  const individualGewichtung = text('individualGewichtung').replace(',', '.');
  return {
    halbjahrId,
    fachId: text('fachId'),
    leistungsart: text('leistungsart') as NoteInput['leistungsart'],
    ...(wertungsbereich === 'schriftlich' || wertungsbereich === 'muendlich'
      ? { wertungsbereich }
      : {}),
    notenwert: Number(text('notenwert').replace(',', '.')),
    individualGewichtung:
      individualGewichtung === '' ? 1 : Number(individualGewichtung),
    date: text('date'),
    comment: comment === '' ? null : comment,
  };
};

/** Die Eintragsleiste: eine Note direkt nach der Rückgabe erfassen. */
export const NoteEntryBar = ({
  halbjahr,
  faecher,
}: {
  readonly halbjahr: {
    readonly id: string;
    readonly notensystem: Notensystem;
    readonly startsOn: string;
    readonly endsOn: string;
  };
  readonly faecher: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
}) => {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const createMutation = useMutation({
    mutationFn: (values: NoteInput) => createNoteFn({ data: values }),
    onSuccess: () => {
      formRef.current?.reset();
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['noten', halbjahr.id] }),
        queryClient.invalidateQueries({ queryKey: ['trend'] }),
      ]);
    },
  });
  const usesNotenpunkte = halbjahr.notensystem === 'punkte';

  return (
    <form
      aria-label="Note eintragen"
      className="border border-border bg-surface p-4 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        createMutation.reset();
        createMutation.mutate(readValues(event.currentTarget, halbjahr.id));
      }}
      ref={formRef}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
        <label className={labelClass}>
          Fach
          <select className={inputClass} name="fachId" required={true}>
            {faecher.map((fach) => (
              <option key={fach.id} value={fach.id}>
                {fach.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Art
          <select className={inputClass} name="leistungsart">
            {Object.entries(leistungsartLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {usesNotenpunkte ? 'Punkte' : 'Note'}
          <input
            className={inputClass}
            inputMode="decimal"
            max={
              usesNotenpunkte
                ? notenLimits.maxNotenpunkte
                : notenLimits.sechserMax
            }
            min={usesNotenpunkte ? 0 : notenLimits.sechserMin}
            name="notenwert"
            required={true}
            step={usesNotenpunkte ? 1 : notenLimits.gewichtungStep}
            type="number"
          />
        </label>
        <label className={labelClass}>
          Datum
          <input
            className={inputClass}
            defaultValue={clampIsoDate(
              berlinCalendarDate(),
              halbjahr.startsOn,
              halbjahr.endsOn,
            )}
            max={halbjahr.endsOn}
            min={halbjahr.startsOn}
            name="date"
            required={true}
            type="date"
          />
        </label>
        <button
          className={`${primaryButtonClass} col-span-2 sm:col-span-1`}
          disabled={createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending
            ? 'Note wird eingetragen …'
            : 'Note eintragen'}
        </button>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-ink-muted text-sm">
          Gewicht, Bereich und Notiz
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Gewicht
            <input
              className={inputClass}
              defaultValue={1}
              inputMode="decimal"
              max={notenLimits.maxGewichtung}
              min={notenLimits.gewichtungStep}
              name="individualGewichtung"
              step={notenLimits.gewichtungStep}
              type="number"
            />
          </label>
          <label className={labelClass}>
            Bereich
            <select className={inputClass} name="wertungsbereich">
              <option value="">Automatisch nach Art</option>
              <option value="schriftlich">Schriftlich</option>
              <option value="muendlich">Mündlich</option>
            </select>
          </label>
          <label className={`${labelClass} col-span-2 sm:col-span-1`}>
            Notiz
            <input className={inputClass} name="comment" />
          </label>
        </div>
      </details>
      {createMutation.isError ? (
        <p
          className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          {actionErrorText(
            createMutation.error,
            'Die Note konnte wegen eines technischen Fehlers nicht gespeichert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
          )}
        </p>
      ) : null}
    </form>
  );
};
