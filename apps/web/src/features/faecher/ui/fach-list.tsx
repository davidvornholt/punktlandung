import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { Fach } from '../services/fach-service.ts';

const gewichtungRow = (fach: Fach): string =>
  `Klausur ${fach.klausurWeight} · Test ${fach.testWeight} · Mündlich ${fach.muendlichWeight} · GFS ${fach.gfsWeight} · Sonstige ${fach.sonstigeWeight}`;

const FachRow = ({
  fach,
  archiveError,
  isArchiving,
  isArchiveRunning,
  onArchive,
  onEdit,
}: {
  readonly fach: Fach;
  readonly archiveError: unknown | null;
  readonly isArchiving: boolean;
  readonly isArchiveRunning: boolean;
  readonly onArchive: () => void;
  readonly onEdit: (trigger: HTMLButtonElement) => void;
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
      {gewichtungRow(fach)}
      {fach.writtenShare === null
        ? ' · gemeinsame Liste'
        : ` · schriftlich ${fach.writtenShare} %`}
    </p>
    <div className="mt-2 flex gap-3">
      <button
        className={quietButtonClass}
        onClick={(event) => onEdit(event.currentTarget)}
        type="button"
      >
        Bearbeiten
      </button>
      <button
        className={quietButtonClass}
        disabled={isArchiveRunning}
        onClick={onArchive}
        type="button"
      >
        {isArchiving ? 'Wird archiviert …' : 'Archivieren'}
      </button>
    </div>
    {archiveError === null ? null : (
      <p
        className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
        role="alert"
      >
        {actionErrorText(
          archiveError,
          'Das Fach konnte nicht archiviert werden. Es bleibt sichtbar; versuche es erneut.',
        )}
      </p>
    )}
  </li>
);

export const FachList = ({
  faecher,
  archiveMutation,
  onArchive,
  onEdit,
}: {
  readonly faecher: ReadonlyArray<Fach>;
  readonly archiveMutation: ListMutation<string>;
  readonly onArchive: (id: string) => void;
  readonly onEdit: (fach: Fach, trigger: HTMLButtonElement) => void;
}) => (
  <ul className="mt-4 space-y-3">
    {faecher.map((fach) => {
      const display = listMutationState(archiveMutation, fach.id);
      return (
        <FachRow
          archiveError={display.error}
          fach={fach}
          key={fach.id}
          onArchive={() => onArchive(fach.id)}
          onEdit={(trigger) => onEdit(fach, trigger)}
          isArchiving={display.pending}
          isArchiveRunning={display.disabled}
        />
      );
    })}
  </ul>
);
