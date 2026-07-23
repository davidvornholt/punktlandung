import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { berlinKalenderdatum } from '#/shared/datum/kalenderdatum.ts';
import { begrenzeIsoDatum } from '#/shared/datum/zeitraum.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { NoteEingabe } from '../schemas/note-schema.ts';
import { notenGrenzen } from '../schemas/note-schema.ts';
import { createNoteFn } from '../server/noten-fns.ts';
import { leistungsartLabel } from './leistungsart-label.ts';

const liesWerte = (form: HTMLFormElement, termId: string): NoteEingabe => {
  const daten = new FormData(form);
  const text = (name: string) => `${daten.get(name) ?? ''}`.trim();
  const bereich = text('area');
  const notiz = text('notiz');
  const gewicht = text('gewicht').replace(',', '.');
  return {
    termId,
    subjectId: text('subjectId'),
    kind: text('kind') as NoteEingabe['kind'],
    ...(bereich === 'schriftlich' || bereich === 'muendlich'
      ? { area: bereich }
      : {}),
    wert: Number(text('wert').replace(',', '.')),
    gewicht: gewicht === '' ? 1 : Number(gewicht),
    datum: text('datum'),
    notiz: notiz === '' ? null : notiz,
  };
};

/** Die Eintragsleiste: eine Note direkt nach der Rückgabe erfassen. */
export const Eintragsleiste = ({
  term,
  faecher,
}: {
  readonly term: {
    readonly id: string;
    readonly system: Notensystem;
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
  const eintragen = useMutation({
    mutationFn: (werte: NoteEingabe) => createNoteFn({ data: werte }),
    onSuccess: () => {
      formRef.current?.reset();
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['noten', term.id] }),
        queryClient.invalidateQueries({ queryKey: ['verlauf'] }),
      ]);
    },
  });
  const punkteSystem = term.system === 'punkte';

  return (
    <form
      aria-label="Note eintragen"
      className="border border-border bg-surface p-4 shadow-card"
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        eintragen.reset();
        eintragen.mutate(liesWerte(ereignis.currentTarget, term.id));
      }}
      ref={formRef}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
        <label className={labelKlasse}>
          Fach
          <select className={eingabeKlasse} name="subjectId" required={true}>
            {faecher.map((fach) => (
              <option key={fach.id} value={fach.id}>
                {fach.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelKlasse}>
          Art
          <select className={eingabeKlasse} name="kind">
            {Object.entries(leistungsartLabel).map(([wert, label]) => (
              <option key={wert} value={wert}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelKlasse}>
          {punkteSystem ? 'Punkte' : 'Note'}
          <input
            className={eingabeKlasse}
            inputMode="decimal"
            max={
              punkteSystem ? notenGrenzen.punkteMax : notenGrenzen.sechserMax
            }
            min={punkteSystem ? 0 : notenGrenzen.sechserMin}
            name="wert"
            required={true}
            step={punkteSystem ? 1 : notenGrenzen.gewichtSchritt}
            type="number"
          />
        </label>
        <label className={labelKlasse}>
          Datum
          <input
            className={eingabeKlasse}
            defaultValue={begrenzeIsoDatum(
              berlinKalenderdatum(),
              term.startsOn,
              term.endsOn,
            )}
            max={term.endsOn}
            min={term.startsOn}
            name="datum"
            required={true}
            type="date"
          />
        </label>
        <button
          className={`${primaerKnopfKlasse} col-span-2 sm:col-span-1`}
          disabled={eintragen.isPending}
          type="submit"
        >
          {eintragen.isPending ? 'Note wird eingetragen …' : 'Note eintragen'}
        </button>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-ink-muted text-sm">
          Gewicht, Bereich und Notiz
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className={labelKlasse}>
            Gewicht
            <input
              className={eingabeKlasse}
              defaultValue={1}
              inputMode="decimal"
              max={notenGrenzen.gewichtMax}
              min={notenGrenzen.gewichtSchritt}
              name="gewicht"
              step={notenGrenzen.gewichtSchritt}
              type="number"
            />
          </label>
          <label className={labelKlasse}>
            Bereich
            <select className={eingabeKlasse} name="area">
              <option value="">Automatisch nach Art</option>
              <option value="schriftlich">Schriftlich</option>
              <option value="muendlich">Mündlich</option>
            </select>
          </label>
          <label className={`${labelKlasse} col-span-2 sm:col-span-1`}>
            Notiz
            <input className={eingabeKlasse} name="notiz" />
          </label>
        </div>
      </details>
      {eintragen.isError ? (
        <p
          className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          {aktionsfehlerText(
            eintragen.error,
            'Die Note konnte wegen eines technischen Fehlers nicht gespeichert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
          )}
        </p>
      ) : null}
    </form>
  );
};
