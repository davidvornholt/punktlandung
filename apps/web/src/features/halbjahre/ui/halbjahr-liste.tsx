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

const loeschbeschriftung = (wirdGeloescht: boolean, bestaetigt: boolean) => {
  if (wirdGeloescht) {
    return 'Wird gelöscht …';
  }
  return bestaetigt ? 'Wirklich löschen' : 'Löschen';
};

const HalbjahrZeile = ({
  halbjahr,
  loeschFehler,
  wirdGeloescht,
  wirdLoeschungAusgefuehrt,
  onBearbeiten,
  onLoeschen,
}: {
  readonly halbjahr: HalbjahrMitNotenAnzahl;
  readonly loeschFehler: unknown | null;
  readonly wirdGeloescht: boolean;
  readonly wirdLoeschungAusgefuehrt: boolean;
  readonly onBearbeiten: (ausloeser: HTMLButtonElement) => void;
  readonly onLoeschen: () => void;
}) => {
  // Zweistufig auf demselben Button: der Fokus bleibt, wo geklickt wurde.
  const [bestaetigt, setBestaetigt] = useState(false);

  return (
    <li className="border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-ink text-xl tracking-tight">
          {halbjahrBezeichnung(halbjahr)}
        </h3>
        <span className="text-ink-faint text-xs uppercase tracking-widest">
          {halbjahr.schoolYear}
        </span>
      </div>
      <p className="mt-1 text-ink-muted text-sm">
        {formatIsoDate(halbjahr.startsOn)} bis {formatIsoDate(halbjahr.endsOn)}{' '}
        · {notensystemText(halbjahr.system)}
      </p>
      <div className="mt-2 flex gap-3">
        <button
          className={quietButtonClass}
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
              onClick={() => {
                if (bestaetigt) {
                  setBestaetigt(false);
                  onLoeschen();
                } else {
                  setBestaetigt(true);
                }
              }}
              type="button"
            >
              {loeschbeschriftung(wirdGeloescht, bestaetigt)}
            </button>
            {bestaetigt ? (
              <button
                className={quietButtonClass}
                onClick={() => setBestaetigt(false)}
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
      {bestaetigt ? (
        <p className="mt-2 text-ink-muted text-sm">
          Das leere Halbjahr wird entfernt.
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
  readonly onLoeschen: (id: string) => void;
}) => (
  <ul className="mt-4 space-y-3">
    {halbjahre.map((halbjahr) => {
      const zeilenstatus = listMutationState(loeschung, halbjahr.id);
      return (
        <HalbjahrZeile
          halbjahr={halbjahr}
          key={halbjahr.id}
          loeschFehler={zeilenstatus.error}
          onBearbeiten={(ausloeser) => onBearbeiten(halbjahr, ausloeser)}
          onLoeschen={() => onLoeschen(halbjahr.id)}
          wirdGeloescht={zeilenstatus.pending}
          wirdLoeschungAusgefuehrt={zeilenstatus.disabled}
        />
      );
    })}
  </ul>
);
