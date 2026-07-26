import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import type { NoteMitFach } from '../services/noten-service.ts';
import { NoteForm } from './note-form.tsx';

const note: NoteMitFach = {
  area: 'schriftlich',
  datum: '2026-02-11',
  fachId: 'latein',
  fachKuerzel: 'L',
  fachName: 'Latein',
  gewicht: 1,
  gewichtung: {
    kindWeights: { gfs: 1, klausur: 1, muendlich: 1, sonstige: 1, test: 1 },
    writtenShare: null,
  },
  id: 'note-1',
  kind: 'klausur',
  notiz: null,
  wert: 2,
};

const term = {
  endsOn: '2026-07-31',
  startsOn: '2026-01-01',
  system: 'sechser',
} as const;

const markup = (
  eigene: {
    readonly note: NoteMitFach | null;
    readonly faecher: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
    }>;
  },
  abbrechbar: boolean,
) =>
  renderToStaticMarkup(
    <NoteForm
      beschaeftigt={false}
      faecher={eigene.faecher}
      fehler={null}
      formularRef={{ current: null }}
      note={eigene.note}
      onAbbrechen={abbrechbar ? () => undefined : null}
      onSpeichern={() => undefined}
      term={term}
      vorgabeDatum="2026-02-11"
    />,
  );

/** Das Fachfeld ohne die umgebenden Felder, damit `selected` eindeutig ist. */
const fachfeld = (gerendert: string) => {
  const start = gerendert.indexOf('name="subjectId"');
  return gerendert.slice(start, gerendert.indexOf('</select>', start));
};

const absendeknopf = (gerendert: string) => {
  const ende = gerendert.indexOf('type="submit"');
  return gerendert.slice(gerendert.lastIndexOf('<button', ende), ende);
};

describe('NoteForm', () => {
  it('hält das archivierte Fach der bearbeiteten Note wählbar und ausgewählt', () => {
    const feld = fachfeld(
      markup(
        {
          faecher: [
            { id: 'biologie', name: 'Biologie' },
            { id: 'deutsch', name: 'Deutsch' },
          ],
          note,
        },
        true,
      ),
    );

    expect(feld).toContain(
      '<option value="latein" selected="">Latein (archiviert)</option>',
    );
    expect(feld.match(/selected=""/gu)).toHaveLength(1);
  });

  it('führt ein noch geführtes Fach genau einmal und ausgewählt', () => {
    const feld = fachfeld(
      markup(
        {
          faecher: [
            { id: 'latein', name: 'Latein' },
            { id: 'deutsch', name: 'Deutsch' },
          ],
          note,
        },
        true,
      ),
    );

    expect(feld.match(/value="latein"/gu)).toHaveLength(1);
    expect(feld).toContain(
      '<option value="latein" selected="">Latein</option>',
    );
    expect(feld).not.toContain('archiviert');
  });

  it('bietet beim Neueintrag keine archivierten Fächer an', () => {
    const feld = fachfeld(
      markup(
        { faecher: [{ id: 'biologie', name: 'Biologie' }], note: null },
        false,
      ),
    );

    expect(feld).not.toContain('archiviert');
    expect(feld.match(/<option/gu)).toHaveLength(1);
  });

  it('lässt den Eintragsknopf auf dem Telefon die volle Breite füllen', () => {
    expect(
      absendeknopf(
        markup(
          { faecher: [{ id: 'biologie', name: 'Biologie' }], note: null },
          false,
        ),
      ),
    ).toContain('w-full sm:w-auto');
  });

  it('lässt Speichern und Abbrechen beim Bearbeiten nebeneinander stehen', () => {
    const gerendert = markup(
      { faecher: [{ id: 'latein', name: 'Latein' }], note },
      true,
    );

    expect(absendeknopf(gerendert)).not.toContain('w-full');
    expect(gerendert).toContain('Abbrechen');
  });
});
