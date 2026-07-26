import { gewichtungsZeile } from '#/shared/noten/gewichtung-text.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { Fach } from '../services/fach-service.ts';

const FachZeile = ({
  fach,
  archivFehler,
  wirdArchiviert,
  wirdArchivierungAusgefuehrt,
  onArchivieren,
  onBearbeiten,
}: {
  readonly fach: Fach;
  readonly archivFehler: unknown | null;
  readonly wirdArchiviert: boolean;
  readonly wirdArchivierungAusgefuehrt: boolean;
  readonly onArchivieren: () => void;
  readonly onBearbeiten: (ausloeser: HTMLButtonElement) => void;
}) => (
  <li className="border border-border bg-surface p-4 shadow-card">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-display text-ink text-xl tracking-tight">
        {fach.name}
      </h3>
      <span className="text-ink-faint text-xs uppercase tracking-widest">
        {fach.shortName}
      </span>
    </div>
    <p className="mt-1 text-ink-muted text-sm">
      {gewichtungsZeile(fach.gewichtung)}
    </p>
    <div className="mt-2 flex gap-3">
      <button
        className={quietButtonClass}
        onClick={(ereignis) => onBearbeiten(ereignis.currentTarget)}
        type="button"
      >
        Bearbeiten
      </button>
      <button
        className={quietButtonClass}
        disabled={wirdArchivierungAusgefuehrt}
        onClick={onArchivieren}
        type="button"
      >
        {wirdArchiviert ? 'Wird archiviert …' : 'Archivieren'}
      </button>
    </div>
    {archivFehler === null ? null : (
      <p
        className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
        role="alert"
      >
        {actionErrorText(
          archivFehler,
          'Das Fach konnte nicht archiviert werden. Es bleibt sichtbar; versuche es erneut.',
        )}
      </p>
    )}
  </li>
);

export const FachListe = ({
  faecher,
  archivierung,
  onArchivieren,
  onBearbeiten,
}: {
  readonly faecher: ReadonlyArray<Fach>;
  readonly archivierung: ListMutation<string>;
  readonly onArchivieren: (id: string) => void;
  readonly onBearbeiten: (fach: Fach, ausloeser: HTMLButtonElement) => void;
}) => (
  <ul className="mt-4 space-y-3">
    {faecher.map((fach) => {
      const zeilenstatus = listMutationState(archivierung, fach.id);
      return (
        <FachZeile
          archivFehler={zeilenstatus.error}
          fach={fach}
          key={fach.id}
          onArchivieren={() => onArchivieren(fach.id)}
          onBearbeiten={(ausloeser) => onBearbeiten(fach, ausloeser)}
          wirdArchiviert={zeilenstatus.pending}
          wirdArchivierungAusgefuehrt={zeilenstatus.disabled}
        />
      );
    })}
  </ul>
);
