import { useState } from 'react';

import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { notenAnzahlText } from '#/shared/noten/notenanzahl-text.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import { halbjahrBezeichnung } from '#/shared/schule/klassenstufe.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { HalbjahrMitNotenAnzahl } from '../services/halbjahr-service.ts';
import type { HalbjahrDeletionRequest } from './halbjahr-deletion-model.ts';
import {
  findAdjacentHalbjahrEditTrigger,
  halbjahrDeletionConfirmationText,
  isFinalHalbjahrInSchoolYear,
} from './halbjahr-deletion-model.ts';

const loeschbeschriftung = (wirdGeloescht: boolean, bestaetigt: boolean) => {
  if (wirdGeloescht) {
    return 'Wird gelöscht …';
  }
  return bestaetigt ? 'Wirklich löschen' : 'Löschen';
};

export const HalbjahrRow = ({
  confirmed,
  halbjahr,
  isFinalInSchoolYear,
  loeschFehler,
  wirdGeloescht,
  wirdLoeschungAusgefuehrt,
  onBearbeiten,
  onConfirmedChange,
  onLoeschen,
}: {
  readonly confirmed: boolean;
  readonly halbjahr: HalbjahrMitNotenAnzahl;
  readonly isFinalInSchoolYear: boolean;
  readonly loeschFehler: unknown | null;
  readonly wirdGeloescht: boolean;
  readonly wirdLoeschungAusgefuehrt: boolean;
  readonly onBearbeiten: (ausloeser: HTMLButtonElement) => void;
  readonly onConfirmedChange: (confirmed: boolean) => void;
  readonly onLoeschen: (focusTarget: HTMLButtonElement | null) => void;
}) => (
  <li
    className="border border-border bg-surface p-4 shadow-card"
    data-halbjahr-row={true}
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
      {formatIsoDate(halbjahr.startsOn)} bis {formatIsoDate(halbjahr.endsOn)} ·{' '}
      {notensystemText(halbjahr.system)}
    </p>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
      <button
        className={quietButtonClass}
        data-halbjahr-edit-trigger={true}
        onClick={(ereignis) => onBearbeiten(ereignis.currentTarget)}
        type="button"
      >
        Bearbeiten
      </button>
      {halbjahr.notenAnzahl === 0 ? (
        <>
          <button
            className={quietButtonClass}
            disabled={wirdLoeschungAusgefuehrt}
            onClick={(event) => {
              if (confirmed) {
                onConfirmedChange(false);
                onLoeschen(
                  findAdjacentHalbjahrEditTrigger(event.currentTarget),
                );
              } else {
                onConfirmedChange(true);
              }
            }}
            type="button"
          >
            {loeschbeschriftung(wirdGeloescht, confirmed)}
          </button>
          {confirmed ? (
            <button
              className={quietButtonClass}
              onClick={() => onConfirmedChange(false)}
              type="button"
            >
              Abbrechen
            </button>
          ) : null}
        </>
      ) : (
        <p className="self-center text-ink-faint text-sm">
          Enthält {notenAnzahlText(halbjahr.notenAnzahl)} und bleibt deshalb
          erhalten.
        </p>
      )}
    </div>
    {confirmed ? (
      <p className="mt-2 text-ink-muted text-sm">
        {halbjahrDeletionConfirmationText(halbjahr, isFinalInSchoolYear)}
      </p>
    ) : null}
    {loeschFehler === null ? null : (
      <p
        className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
        role="alert"
      >
        {actionErrorText(
          loeschFehler,
          'Das Halbjahr konnte nicht gelöscht werden. Es bleibt in der Liste; versuche es erneut.',
        )}
      </p>
    )}
  </li>
);

const HalbjahrZeile = (
  props: Omit<
    Parameters<typeof HalbjahrRow>[0],
    'confirmed' | 'onConfirmedChange'
  >,
) => {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <HalbjahrRow
      {...props}
      confirmed={confirmed}
      onConfirmedChange={setConfirmed}
    />
  );
};

export const HalbjahrListe = ({
  halbjahre,
  loeschung,
  onBearbeiten,
  onLoeschen,
}: {
  readonly halbjahre: ReadonlyArray<HalbjahrMitNotenAnzahl>;
  readonly loeschung: ListMutation<string>;
  readonly onBearbeiten: (
    halbjahr: HalbjahrMitNotenAnzahl,
    ausloeser: HTMLButtonElement,
  ) => void;
  readonly onLoeschen: (request: HalbjahrDeletionRequest) => void;
}) => (
  <ul className="mt-4 space-y-3">
    {halbjahre.map((halbjahr) => {
      const zeilenstatus = listMutationState(loeschung, halbjahr.id);
      return (
        <HalbjahrZeile
          halbjahr={halbjahr}
          isFinalInSchoolYear={isFinalHalbjahrInSchoolYear(halbjahre, halbjahr)}
          key={halbjahr.id}
          loeschFehler={zeilenstatus.error}
          onBearbeiten={(ausloeser) => onBearbeiten(halbjahr, ausloeser)}
          onLoeschen={(focusTarget) => onLoeschen({ focusTarget, halbjahr })}
          wirdGeloescht={zeilenstatus.pending}
          wirdLoeschungAusgefuehrt={zeilenstatus.disabled}
        />
      );
    })}
  </ul>
);
