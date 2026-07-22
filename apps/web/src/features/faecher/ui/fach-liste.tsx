import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import { leiseKnopfKlasse } from '#/shared/ui/form-klassen.ts';
import type { Fach } from '../services/fach-service.ts';

const gewichtszeile = (fach: Fach): string =>
  `Klausur ${fach.klausurWeight} · Test ${fach.testWeight} · Mündlich ${fach.muendlichWeight} · GFS ${fach.gfsWeight} · Sonstige ${fach.sonstigeWeight}`;

const FachZeile = ({
  fach,
  archivFehler,
  wirdArchiviert,
  onArchivieren,
  onBearbeiten,
}: {
  readonly fach: Fach;
  readonly archivFehler: unknown | null;
  readonly wirdArchiviert: boolean;
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
      {gewichtszeile(fach)}
      {fach.writtenShare === null
        ? ' · gemeinsame Liste'
        : ` · schriftlich ${fach.writtenShare} %`}
    </p>
    <div className="mt-2 flex gap-3">
      <button
        className={leiseKnopfKlasse}
        onClick={(ereignis) => onBearbeiten(ereignis.currentTarget)}
        type="button"
      >
        Bearbeiten
      </button>
      <button
        className={leiseKnopfKlasse}
        disabled={wirdArchiviert}
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
        {aktionsfehlerText(
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
  readonly archivierung: {
    readonly error: unknown;
    readonly isError: boolean;
    readonly isPending: boolean;
    readonly variables: string | undefined;
  };
  readonly onArchivieren: (id: string) => void;
  readonly onBearbeiten: (fach: Fach, ausloeser: HTMLButtonElement) => void;
}) => (
  <ul className="mt-4 space-y-3">
    {faecher.map((fach) => {
      const istZiel = archivierung.variables === fach.id;
      return (
        <FachZeile
          archivFehler={
            archivierung.isError && istZiel ? archivierung.error : null
          }
          fach={fach}
          key={fach.id}
          onArchivieren={() => onArchivieren(fach.id)}
          onBearbeiten={(ausloeser) => onBearbeiten(fach, ausloeser)}
          wirdArchiviert={archivierung.isPending && istZiel}
        />
      );
    })}
  </ul>
);
