import type { ReactNode } from 'react';

import { errorPanelClass } from '#/shared/ui/form-classes.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { NotenChooser } from './noten-chooser.tsx';
import {
  type FachSectionContext,
  NotenFachSection,
} from './noten-fach-section.tsx';
import type { FachGroup } from './noten-list-model.ts';
import { type NotenListProps, useNotenList } from './noten-list-state.ts';

/**
 * A failed refresh keeps the list already shown, so an open entry stays
 * mounted with what was typed; this says the list may be out of date.
 */
const RefreshError = ({
  show,
  onRetry,
}: {
  readonly show: boolean;
  readonly onRetry: () => Promise<unknown>;
}) =>
  show ? (
    <div className="mb-6">
      <QueryError
        onRetry={onRetry}
        text="Die Notenliste konnte nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
      />
    </div>
  ) : null;

/** A new Note that failed after its entry was closed has no row and no form to say so. */
const LostCreate = ({ fachName }: { readonly fachName: string | null }) =>
  fachName === null ? null : (
    <p className={`${errorPanelClass} mb-6`} role="alert">
      Die neue Note{fachName === '' ? '' : ` in ${fachName}`} wurde nicht
      gespeichert. Trage sie noch einmal ein.
    </p>
  );

/**
 * On a phone the Fächer stand below each other with bar and list, which is a
 * long way to scroll. This strip stays under the top bar and goes to a Fach.
 */
const FachStrip = ({
  groups,
  onJump,
}: {
  readonly groups: ReadonlyArray<FachGroup>;
  readonly onJump: (fachId: string) => void;
}) => (
  <nav
    aria-label="Fächer dieser Seite"
    className="sticky top-13 z-10 -mx-4 desk:hidden border-line-soft border-b bg-paper"
  >
    <ul className="flex gap-1.5 overflow-x-auto px-4 py-2">
      {groups.map((group) => (
        <li className="flex-none" key={group.id}>
          <button
            // What answers a finger is higher than the button looks, so the strip stays low.
            className="relative min-h-9 min-w-10 border-[1.5px] border-line px-2 font-bold text-sm transition-colors duration-100 ease-standard after:absolute after:-inset-x-[3px] after:-inset-y-1.5 hover:border-ink active:bg-sheet"
            onClick={() => onJump(group.id)}
            type="button"
          >
            {group.kuerzel}
            {/* The name follows the Kürzel, so a voice command that says what is printed still finds the button. */}
            <span className="sr-only">, {group.name}</span>
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

/** As many Fächer as fit on a phone's screen without a way to jump between them. */
const fewFaecher = 2;

/**
 * The Noten of a Halbjahr, Fach by Fach: each with the bar its Noten lie on
 * and the list of them. A Note is entered and changed on the bar of its Fach.
 */
export const NotenList = (props: NotenListProps) => {
  const { halbjahr, link, today } = props;
  const list = useNotenList(props);
  /*
   * Auffangziel für den Fokus: der Knopf, der einen Eintrag geöffnet hat,
   * verschwindet mit dem Neuabruf, wenn die Note ihr Fach gewechselt hat oder
   * gelöscht wurde. Ohne dieses Ziel landete der Fokus auf <body>. Der
   * Abschnitt trägt deshalb jeden Zustand der Liste.
   */
  const shell = (children: ReactNode) => (
    <section aria-label="Notenliste" ref={list.regionRef} tabIndex={-1}>
      <p className="sr-only" role="status">
        {list.writes.announcement}
      </p>
      {children}
    </section>
  );
  if (list.isPending) {
    return shell(<LoadingHint text="Notenliste wird geladen …" />);
  }
  if (list.noten === undefined) {
    return shell(
      <QueryError
        onRetry={list.retry}
        text="Die Notenliste konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
      />,
    );
  }
  const { open, writes } = list;
  const context: FachSectionContext = {
    halbjahr,
    today,
    link,
    deleteErrors: writes.deleteErrors,
    deleteMutation: writes.deleteMutation,
    savedErrors: writes.savedErrors,
    landedId: list.landed,
    onAdd: list.add,
    onDelete: writes.remove,
    onEdit: list.edit,
  };
  return shell(
    <>
      <RefreshError onRetry={list.retry} show={list.isError} />
      <LostCreate fachName={writes.lostCreate} />
      {open?.kind === 'choose' && list.selectable.length > 0 ? (
        <NotenChooser
          groups={list.selectable}
          moving={open.carry?.leistung ?? null}
          onCancel={list.cancelChoice}
          onPick={list.pick}
          system={halbjahr.system}
          today={today}
        />
      ) : null}
      {list.groups.length > fewFaecher ? (
        <FachStrip groups={list.groups} onJump={list.jump} />
      ) : null}
      {list.groups.map((group) => (
        <NotenFachSection
          context={context}
          entry={list.entryFor(group)}
          group={group}
          key={group.id}
        />
      ))}
    </>,
  );
};
