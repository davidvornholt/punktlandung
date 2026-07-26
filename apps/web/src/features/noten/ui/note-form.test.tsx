import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import { NoteForm } from './note-form.tsx';

const note: NoteWithFach = {
  datum: '2026-02-11',
  fachId: 'latein',
  fachKuerzel: 'L',
  fachName: 'Latein',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id: 'note-1',
  kind: 'klausur',
  notiz: null,
  wert: 2,
};

const halbjahr = {
  endsOn: '2026-07-31',
  startsOn: '2026-01-01',
  system: 'sechser',
} as const;

type FachList = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}>;

/** Die Bearbeitungsrolle: das Datum stammt aus der Note, nicht aus einer Vorgabe. */
const editMarkup = (faecher: FachList, own: NoteWithFach = note) =>
  renderToStaticMarkup(
    <NoteForm
      error={null}
      faecher={faecher}
      formRef={{ current: null }}
      halbjahr={halbjahr}
      note={own}
      onCancel={() => undefined}
      onSave={() => undefined}
      pending={false}
    />,
  );

/** Die Eintragsrolle: leere Felder mit vorgeschlagenem Datum. */
const entryMarkup = (faecher: FachList) =>
  renderToStaticMarkup(
    <NoteForm
      defaultDate="2026-02-11"
      error={null}
      faecher={faecher}
      formRef={{ current: null }}
      halbjahr={halbjahr}
      note={null}
      onCancel={null}
      onSave={() => undefined}
      pending={false}
    />,
  );

/** Das Fachfeld ohne die umgebenden Felder, damit `selected` eindeutig ist. */
const fachField = (rendered: string) => {
  const start = rendered.indexOf('name="subjectId"');
  return rendered.slice(start, rendered.indexOf('</select>', start));
};

const submitButton = (rendered: string) => {
  const end = rendered.indexOf('type="submit"');
  return rendered.slice(rendered.lastIndexOf('<button', end), end);
};

describe('NoteForm', () => {
  it('hält das archivierte Fach der bearbeiteten Note wählbar und ausgewählt', () => {
    const field = fachField(
      editMarkup([
        { id: 'biologie', name: 'Biologie' },
        { id: 'deutsch', name: 'Deutsch' },
      ]),
    );

    expect(field).toContain(
      '<option value="latein" selected="">Latein (archiviert)</option>',
    );
    expect(field.match(/selected=""/gu)).toHaveLength(1);
  });

  it('führt ein noch geführtes Fach genau einmal und ausgewählt', () => {
    const field = fachField(
      editMarkup([
        { id: 'latein', name: 'Latein' },
        { id: 'deutsch', name: 'Deutsch' },
      ]),
    );

    expect(field.match(/value="latein"/gu)).toHaveLength(1);
    expect(field).toContain(
      '<option value="latein" selected="">Latein</option>',
    );
    expect(field).not.toContain('archiviert');
  });

  it('bietet beim Neueintrag keine archivierten Fächer an', () => {
    const field = fachField(
      entryMarkup([{ id: 'biologie', name: 'Biologie' }]),
    );

    expect(field).not.toContain('archiviert');
    expect(field.match(/<option/gu)).toHaveLength(1);
  });

  it('lässt den Eintragsknopf auf dem Telefon die volle Breite füllen', () => {
    expect(
      submitButton(entryMarkup([{ id: 'biologie', name: 'Biologie' }])),
    ).toContain('w-full sm:w-auto');
  });

  it('belegt beim Bearbeiten Datum und Gewicht aus der Note', () => {
    const rendered = editMarkup([{ id: 'latein', name: 'Latein' }], {
      ...note,
      datum: '2026-03-05',
      gewicht: 1.5,
    });

    expect(rendered).toContain('value="2026-03-05"');
    expect(rendered).toContain('value="1.5"');
  });

  it('lässt Speichern und Abbrechen beim Bearbeiten nebeneinander stehen', () => {
    const rendered = editMarkup([{ id: 'latein', name: 'Latein' }]);

    expect(submitButton(rendered)).not.toContain('w-full');
    expect(rendered).toContain('Abbrechen');
  });
});
