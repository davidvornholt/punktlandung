import { Link } from '@tanstack/react-router';

import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { NotenList } from './noten-list.tsx';
import type { NotenListProps } from './noten-list-state.ts';

/**
 * Der Notenteil eines Halbjahrs. Steht ohne eigenen Zustand da, damit sich
 * die Entscheidung, was bei welchem Fachstand erscheint, ohne Renderer prüfen
 * lässt.
 */
export const NotenSection = (props: NotenListProps) => (
  <>
    {/*
     * Ohne wählbares Fach lässt sich keine Note eintragen. Die Notenliste
     * bleibt trotzdem stehen: sind alle Fächer des Schuljahrs archiviert,
     * hängen die eingetragenen Noten weiter an ihnen und müssen korrigierbar
     * bleiben.
     */}
    {props.faecher.length === 0 ? (
      <div className="mb-8">
        <EmptyState
          text="Eine Note gehört zu einem Fach. Lege ein Fach samt Gewichtung an, dann kannst du hier Noten eintragen. Noten an archivierten Fächern bleiben unten sichtbar und korrigierbar."
          title="Noch kein Fach in diesem Schuljahr"
        >
          <Link className={primaryButtonClass} to="/faecher">
            Fach anlegen
          </Link>
        </EmptyState>
      </div>
    ) : null}
    <NotenList {...props} />
  </>
);
