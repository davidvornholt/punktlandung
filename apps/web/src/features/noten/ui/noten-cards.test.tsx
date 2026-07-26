import { describe, expect, it, mock } from 'bun:test';
import type { ReactElement } from 'react';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import { NotenCards } from './noten-cards.tsx';

const note = (id: string, datum = '2026-01-01'): NoteWithFach => ({
  datum,
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur',
  notiz: `Notiz ${id}`,
  wert: 2,
});

const idle = {
  error: null,
  isError: false,
  isPending: false,
  variables: undefined,
};

const noten = [note('A'), note('B', '2026-02-02')] as const;

const cards = (
  editNoteId: string | null,
  updateMutation: ListMutation<string> = idle,
) =>
  renderToStaticMarkup(
    <NotenCards
      deleteMutation={idle}
      editNoteId={editNoteId}
      form={<p>Formular</p>}
      noten={noten}
      onDelete={() => undefined}
      onEdit={() => undefined}
      system="sechser"
      updateMutation={updateMutation}
    />,
  );

/** Sammelt die gerenderten Knöpfe samt ihrer Eigenschaften. */
const buttons = (node: unknown): ReadonlyArray<ReactElement> => {
  if (Array.isArray(node)) {
    return node.flatMap(buttons);
  }
  if (!isValidElement(node)) {
    return [];
  }
  const props = node.props as { readonly children?: unknown };
  if (typeof node.type === 'function') {
    const component = node.type as (props: unknown) => unknown;
    return buttons(component(node.props));
  }
  return [
    ...(node.type === 'button' ? [node] : []),
    ...buttons(props.children),
  ];
};

const editButton = (editNoteId: string | null, onEdit: unknown) =>
  buttons(
    NotenCards({
      deleteMutation: idle,
      editNoteId,
      form: null,
      noten: [note('A')],
      onDelete: () => undefined,
      onEdit: onEdit as (
        note: NoteWithFach | null,
        trigger: HTMLButtonElement,
      ) => void,
      system: 'sechser',
      updateMutation: idle,
    }),
  )[0]?.props as {
    readonly onClick: (event: {
      readonly currentTarget: HTMLButtonElement;
    }) => void;
  };

describe('NotenCards', () => {
  it('zeigt das Formular unter der bearbeiteten Note', () => {
    const markup = cards('A');

    expect(markup.indexOf('Formular')).toBeGreaterThan(
      markup.indexOf('Notiz A'),
    );
    expect(markup.indexOf('Formular')).toBeLessThan(markup.indexOf('Notiz B'));
    expect(markup.match(/Formular/gu)).toHaveLength(1);
  });

  it('blendet Löschen nur für die Note aus, die gerade bearbeitet wird', () => {
    expect(cards('A').match(/>Löschen</gu)).toHaveLength(1);
    expect(cards(null).match(/>Löschen</gu)).toHaveLength(2);
  });

  it('bietet jede Note zum Bearbeiten an', () => {
    expect(cards(null).match(/>Bearbeiten</gu)).toHaveLength(2);
  });

  it('benennt die Aktionen jeder Zeile mit ihrer Note', () => {
    const markup = cards(null);

    expect(markup).toContain(
      'aria-label="Bearbeiten: Note 2, Klausur vom 01.01.2026"',
    );
    expect(markup).toContain(
      'aria-label="Löschen: Note 2, Klausur vom 01.01.2026"',
    );
    expect(markup).toContain(
      'aria-label="Bearbeiten: Note 2, Klausur vom 02.02.2026"',
    );
    expect(markup).toContain(
      'aria-label="Löschen: Note 2, Klausur vom 02.02.2026"',
    );
  });

  it('meldet die offene Zeile als aufgeklappt und bleibt bedienbar', () => {
    const markup = cards('A');

    expect(markup).toContain('aria-controls="notenformular-A"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('id="notenformular-A"');
    expect(markup.match(/aria-expanded="false"/gu)).toHaveLength(1);
    expect(markup).not.toContain('disabled=""');
  });

  it('meldet eine gescheiterte Änderung in der Zeile, deren Formular schon zu ist', () => {
    const failed: ListMutation<string> = {
      error: new Error('Verbindung weg'),
      isError: true,
      isPending: false,
      variables: 'A',
    };
    const markup = cards(null, failed);

    expect(markup.match(/role="alert"/gu)).toHaveLength(1);
    expect(markup.indexOf('role="alert"')).toBeGreaterThan(
      markup.indexOf('Notiz A'),
    );
    expect(markup.indexOf('role="alert"')).toBeLessThan(
      markup.indexOf('Notiz B'),
    );
    expect(markup).toContain('Die Änderung an dieser Note wurde nicht');
    expect(cards('A', failed)).not.toContain('role="alert"');
  });

  it('öffnet mit dem Auslöser die geschlossene Zeile', () => {
    const trigger = {} as HTMLButtonElement;
    const onEdit = mock(
      (_note: NoteWithFach | null, _trigger: HTMLButtonElement) => undefined,
    );

    editButton(null, onEdit).onClick({ currentTarget: trigger });

    expect(onEdit).toHaveBeenCalledWith(note('A'), trigger);
  });

  it('schließt die offene Zeile, statt sie wirkungslos erneut zu öffnen', () => {
    const trigger = {} as HTMLButtonElement;
    const onEdit = mock(
      (_note: NoteWithFach | null, _trigger: HTMLButtonElement) => undefined,
    );

    editButton('A', onEdit).onClick({ currentTarget: trigger });

    expect(onEdit).toHaveBeenCalledWith(null, trigger);
  });
});
