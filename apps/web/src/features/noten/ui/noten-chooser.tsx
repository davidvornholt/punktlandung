import { useId } from 'react';

import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { buttonClass, sheetClass } from '#/shared/ui/form-classes.ts';
import type { Leistung } from '../services/noten-service.ts';
import { useEntryEscape } from './entry-escape.ts';
import { fachRuler } from './fach-ruler.ts';
import type { FachGroup } from './noten-list-model.ts';
import { tieUnits } from './noten-text.ts';

/** What a Fach says under its name: where the Leistung is now, or where the Fach stands. */
const secondLine = ({
  average,
  here,
  system,
}: {
  readonly average: number | null;
  /** The Leistung that is being moved is in this Fach. */
  readonly here: boolean;
  readonly system: Notensystem;
}): string => {
  if (here) {
    return 'bisheriges Fach';
  }
  return average === null
    ? 'noch keine Note'
    : // The figure keeps its unit when a narrow Fach breaks the line.
      tieUnits(`Fachschnitt ${formatNote(average, system)}`);
};

/**
 * Asks which Fach a Note goes into: a new one, or one that is being moved.
 * The Fächer stand side by side with where each stands, because that is how
 * a Fach is recognised at a glance.
 */
export const NotenChooser = ({
  groups,
  moving,
  onCancel,
  onPick,
  system,
  today,
}: {
  /** The Fächer a Note can be entered in. */
  readonly groups: ReadonlyArray<FachGroup>;
  /** The Leistung that moves to another Fach; `null` for a new Note. */
  readonly moving: Leistung | null;
  readonly onCancel: () => void;
  readonly onPick: (fachId: string) => void;
  readonly system: Notensystem;
  /** ISO date. */
  readonly today: string;
}) => {
  const titleId = useId();
  useEntryEscape(true, onCancel);
  return (
    <section
      aria-labelledby={titleId}
      className={`${sheetClass} mb-[1.875rem] animate-eases-in desk:px-5 px-3.5 desk:pt-4 pt-3.5 desk:pb-5 pb-4`}
      data-chooser=""
      data-note-entry=""
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-bold text-lg" id={titleId}>
          {moving === null
            ? 'Neue Note: in welchem Fach?'
            : `${leistungsartLabel[moving.kind]} verschieben: in welches Fach?`}
        </h2>
        <button
          className={`${buttonClass('quiet', 'compact')} -mr-2`}
          onClick={onCancel}
          type="button"
        >
          Abbrechen
        </button>
      </div>
      <ul className="grid desk:grid-cols-4 grid-cols-2 gap-2">
        {groups.map((group) => {
          const { average } = fachRuler({
            gewichtung: group.gewichtung,
            leistungen: group.leistungen,
            system,
            today,
          }).evaluation;
          return (
            <li key={group.id}>
              <button
                // Every Fach of a row is as high as the one whose Schnitt needs a second line.
                className="group flex size-full min-h-[3.75rem] flex-col justify-center border-[1.5px] border-ink bg-paper px-3.5 py-2 text-left font-bold transition-colors duration-100 ease-standard hover:bg-ink hover:text-paper"
                onClick={() => onPick(group.id)}
                type="button"
              >
                {group.name}
                <span className="font-normal text-[0.84375rem] text-ink-soft group-hover:text-paper">
                  {secondLine({
                    average,
                    here: moving?.fachId === group.id,
                    system,
                  })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
