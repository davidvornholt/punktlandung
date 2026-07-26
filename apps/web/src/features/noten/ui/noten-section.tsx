import { Link } from '@tanstack/react-router';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { NoteEntryBar } from './note-entry-bar.tsx';
import { NotenList } from './noten-list.tsx';

type Halbjahr = {
  readonly id: string;
  readonly system: Notensystem;
  readonly startsOn: string;
  readonly endsOn: string;
};

/**
 * Der Notenteil eines Halbjahrs: Eintragsleiste und Notenliste. Steht ohne
 * eigenen Zustand da, damit sich die Entscheidung, was bei welchem Fachstand
 * erscheint, ohne Renderer prüfen lässt.
 */
export const NotenSection = ({
  halbjahr,
  faecher,
}: {
  readonly halbjahr: Halbjahr;
  readonly faecher: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
}) => (
  <>
    {/*
     * Ohne wählbares Fach lässt sich keine Note eintragen — die Eintragsleiste
     * weicht dem Hinweis. Die Notenliste bleibt trotzdem stehen: sind alle
     * Fächer des Schuljahrs archiviert, hängen die eingetragenen Noten weiter
     * an ihnen und müssen korrigierbar bleiben.
     */}
    {faecher.length === 0 ? (
      <div className="mt-6 border border-border bg-surface-sunken p-8">
        <p className="text-ink">Keine wählbaren Fächer.</p>
        <p className="mt-2 text-ink-muted">
          Lege unter{' '}
          <Link className="underline underline-offset-4" to="/faecher">
            Fächer
          </Link>{' '}
          ein Fach samt Gewichtung an, dann kannst du hier Noten eintragen.
          Noten an archivierten Fächern bleiben unten sichtbar und korrigierbar.
        </p>
      </div>
    ) : (
      <div className="mt-4">
        <NoteEntryBar faecher={faecher} halbjahr={halbjahr} />
      </div>
    )}
    <NotenList faecher={faecher} halbjahr={halbjahr} />
  </>
);
