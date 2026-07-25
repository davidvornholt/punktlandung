import { formatiereIsoDatum } from '#/shared/datum/kalenderdatum.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import { halbjahrBezeichnung } from '#/shared/schule/klassenstufe.ts';
import { leiseKnopfKlasse } from '#/shared/ui/form-klassen.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';

export const HalbjahrListe = ({
  halbjahre,
  onBearbeiten,
}: {
  readonly halbjahre: ReadonlyArray<Halbjahr>;
  readonly onBearbeiten: (
    halbjahr: Halbjahr,
    ausloeser: HTMLButtonElement,
  ) => void;
}) => (
  <ul className="mt-4 space-y-3">
    {halbjahre.map((halbjahr) => (
      <li
        className="border border-border bg-surface p-4 shadow-card"
        key={halbjahr.id}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-ink text-xl tracking-tight">
            {halbjahrBezeichnung(halbjahr)}
          </h3>
          <span className="text-ink-faint text-xs uppercase tracking-widest">
            {halbjahr.schoolYear}
          </span>
        </div>
        <p className="mt-1 text-ink-muted text-sm">
          {formatiereIsoDatum(halbjahr.startsOn)} bis{' '}
          {formatiereIsoDatum(halbjahr.endsOn)} ·{' '}
          {notensystemText(halbjahr.system)}
        </p>
        <div className="mt-2">
          <button
            className={leiseKnopfKlasse}
            onClick={(ereignis) =>
              onBearbeiten(halbjahr, ereignis.currentTarget)
            }
            type="button"
          >
            Bearbeiten
          </button>
        </div>
      </li>
    ))}
  </ul>
);
