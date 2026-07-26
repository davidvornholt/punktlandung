import { describe, expect, it } from 'bun:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import { NoteRow } from './note-row.tsx';

const note: NoteWithFach = {
  datum: '2026-01-01',
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id: 'A',
  kind: 'klausur',
  notiz: null,
  wert: 2,
};

const idle: ListMutation<string> = {
  error: null,
  isError: false,
  isPending: false,
  variables: undefined,
};

const deleting: ListMutation<string> = {
  error: null,
  isError: false,
  isPending: true,
  variables: 'A',
};

type RowProps = ComponentProps<typeof NoteRow>;

const baseProps: RowProps = {
  deleteMutation: idle,
  editPending: false,
  form: <p>Formular</p>,
  isEditing: false,
  note,
  onDelete: () => undefined,
  onEdit: () => undefined,
  position: 1,
  savedError: null,
  system: 'sechser',
};

const row = (overrides: Partial<RowProps> = {}) =>
  renderToStaticMarkup(<NoteRow {...baseProps} {...overrides} />);

describe('NoteRow', () => {
  it('nimmt die Zeilennummer in beide Aktionsnamen auf', () => {
    const markup = row({ position: 2 });

    expect(markup).toContain(
      'aria-label="Bearbeiten: Note 2, Klausur vom 01.01.2026, Eintrag 2"',
    );
    expect(markup).toContain(
      'aria-label="Löschen: Note 2, Klausur vom 01.01.2026, Eintrag 2"',
    );
  });

  it('verweist nur die offene Zeile auf ihr Formular', () => {
    expect(row({ isEditing: true })).toContain(
      'aria-controls="notenformular-A"',
    );
    expect(row()).not.toContain('aria-controls');
  });

  it('benennt den laufenden Löschvorgang als Satz', () => {
    const markup = row({ deleteMutation: deleting });

    expect(markup).toContain(
      'aria-label="Note 2, Klausur vom 01.01.2026, Eintrag 1 wird gelöscht …"',
    );
    expect(markup).toContain('>Wird gelöscht …<');
    expect(markup).not.toContain('gelöscht …:');
  });

  it('sperrt beide Zeilenaktionen, solange ein Löschvorgang läuft', () => {
    expect(
      row({ deleteMutation: deleting }).match(/disabled=""/gu),
    ).toHaveLength(2);
  });

  it('sperrt das Schließen, solange das Speichern dieser Zeile läuft', () => {
    expect(row({ editPending: true, isEditing: true })).toContain(
      'disabled=""',
    );
    expect(row({ editPending: false, isEditing: true })).not.toContain(
      'disabled=""',
    );
  });

  it('meldet einen Änderungsfehler nur in der wieder geschlossenen Zeile', () => {
    const error = new Error('Verbindung weg');

    expect(row({ savedError: error })).toContain(
      'Die Änderung an dieser Note wurde nicht gespeichert',
    );
    expect(row({ isEditing: true, savedError: error })).not.toContain(
      'role="alert"',
    );
  });
});
