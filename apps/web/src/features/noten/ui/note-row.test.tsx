import { describe, expect, it } from 'bun:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { nbsp, relativeDateText } from '#/shared/date/date-text.ts';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { Leistung } from '../services/noten-service.ts';
import { NoteRow } from './note-row.tsx';
import { PlainLeistungLink } from './noten-links.story-fixtures.tsx';

const today = '2026-11-26';

const tag = /<[^>]+>/gu;

/** What the row says, without its markup: a line of the row is built from several elements. */
const textOf = (markup: string): string => markup.replaceAll(tag, '');

const base = {
  datum: '2026-01-01',
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id: 'A',
  kind: 'klausur',
  notiz: null,
} as const;

const note: Leistung = { ...base, status: 'graded', wert: 2 };
const waiting: Leistung = { ...base, status: 'planned', datum: '2026-12-10' };

const idle: ListMutation<string> = {
  error: null,
  isError: false,
  isPending: false,
  variables: undefined,
};

const deleting = (id: string): ListMutation<string> => ({
  error: null,
  isError: false,
  isPending: true,
  variables: id,
});

type RowProps = ComponentProps<typeof NoteRow>;

const baseProps: RowProps = {
  deleteError: null,
  deleteMutation: idle,
  figure: { share: 0.5, state: 'graded', label: 'Klausur vom 01.01.2026, 2' },
  highlighted: false,
  leistung: note,
  link: PlainLeistungLink,
  marked: false,
  onDelete: () => undefined,
  onEdit: () => undefined,
  onHighlight: () => undefined,
  position: 1,
  savedError: undefined,
  system: 'sechser',
  today,
};

const row = (overrides: Partial<RowProps> = {}) =>
  renderToStaticMarkup(<NoteRow {...baseProps} {...overrides} />);

const count = (markup: string, part: string) => markup.split(part).length - 1;

describe('NoteRow', () => {
  it('nimmt die Zeilennummer in beide Aktionsnamen auf', () => {
    const markup = row({ position: 2 });

    expect(markup).toContain(
      'aria-label="Bearbeiten: Klausur vom 01.01.2026, 2, Eintrag 2"',
    );
    expect(markup).toContain(
      'aria-label="Löschen: Klausur vom 01.01.2026, 2, Eintrag 2"',
    );
  });

  it('zeigt Art, Notiz, Tag, Anteil und Note', () => {
    const markup = row({ leistung: { ...note, notiz: 'Lyrik' } });

    expect(markup).toContain('Klausur</b> · Lyrik');
    expect(textOf(markup)).toContain(
      `Do${nbsp}01.01. · zählt${nbsp}50${nbsp}%`,
    );
    expect(markup).toContain('data-row-value="">2</b>');
    expect(markup).not.toContain('-fach');
  });

  it('nennt die Einheit der Notenpunkte neben der Zahl', () => {
    const markup = row({
      leistung: { ...note, wert: 11 },
      system: 'punkte',
    });

    expect(markup).toContain('data-row-value="">11</b> P.');
  });

  it('nennt ein Gewicht, das vom einfachen abweicht', () => {
    expect(textOf(row({ leistung: { ...note, gewicht: 2 } }))).toContain(
      `zählt${nbsp}50${nbsp}% · 2-fach`,
    );
  });

  /**
   * Die Frage bleibt stehen, solange gelöscht wird: sie sagt, welche Leistung
   * gerade verschwindet. Behalten ließe sich dann nichts mehr.
   */
  it('benennt den laufenden Löschvorgang in der Zeile selbst', () => {
    const markup = row({ deleteMutation: deleting('A') });

    expect(markup).toContain('Klausur vom 01.01. löschen?');
    expect(markup).toContain('Wird gelöscht …');
    expect(markup).toContain('<li aria-busy="true"');
    expect(count(markup, 'disabled=""')).toBe(1);
    expect(markup).not.toContain('aria-label="Bearbeiten');
  });

  /**
   * Während eine Zeile der Liste gelöscht wird, führten die Knöpfe der
   * anderen ins Leere oder starteten ein zweites Löschen daneben.
   */
  it('sperrt beide Knöpfe, solange eine andere Zeile gelöscht wird', () => {
    const markup = row({ deleteMutation: deleting('B') });

    expect(count(markup, 'disabled=""')).toBe(2);
    expect(markup).not.toContain('aria-busy');
    expect(markup).not.toContain('löschen?');
  });
});

describe('NoteRow ohne Note und mit Meldung', () => {
  it('zeigt eine ausstehende Leistung ohne Note und benennt den Knopf nach dem, was er tut', () => {
    const markup = row({
      figure: {
        share: 0.5,
        state: 'pending',
        label: 'Klausur vom 10.12.2026, ausstehend',
      },
      leistung: waiting,
      position: 3,
    });

    expect(markup).toContain('>ausstehend<');
    // Wie weit der Tag noch weg ist, sagt die Zeile mit den Worten der ganzen Anwendung.
    expect(relativeDateText(today, waiting.datum)).toContain('14');
    expect(textOf(markup)).toContain(
      ` · ${relativeDateText(today, waiting.datum)} · zählt${nbsp}50${nbsp}%`,
    );
    expect(markup).toContain(
      'aria-label="Note eintragen: Klausur vom 10.12.2026, ausstehend, Eintrag 3"',
    );
    expect(markup).not.toContain('aria-label="Bearbeiten');
    expect(markup).not.toContain('data-row-value');
  });

  it('sagt, wenn der Tag vorbei ist und die Note fehlt', () => {
    const markup = row({
      figure: {
        share: 0.5,
        state: 'missing',
        label: 'Klausur vom 01.10.2026, Note fehlt noch',
      },
      leistung: { ...waiting, datum: '2026-10-01' },
    });

    expect(markup).toContain('Note fehlt noch');
    expect(markup).not.toContain('>ausstehend<');
  });

  it('markiert die eben gespeicherte und die auf der Skala gezeigte Zeile', () => {
    expect(row()).not.toContain('animate-marked');
    expect(row({ marked: true })).toContain('animate-marked');
    expect(row()).not.toContain('data-hover=""');
    expect(row({ highlighted: true })).toContain('data-hover=""');
  });

  it('meldet einen Fehler unter der Zeile, der er gilt', () => {
    const technical = new Error('Verbindung weg');
    const domain = {
      _tag: 'HalbjahrGesperrt',
      message: 'Das Halbjahr ist gesperrt.',
    };

    expect(row()).not.toContain('role="alert"');
    expect(row({ deleteError: technical })).toContain(
      'Die Note konnte nicht gelöscht werden.',
    );
    expect(row({ savedError: technical })).toContain(
      'Öffne sie erneut zum Bearbeiten',
    );
    expect(row({ savedError: domain })).toContain('Das Halbjahr ist gesperrt.');
    expect(count(row({ deleteError: technical }), 'role="alert"')).toBe(1);
  });
});
