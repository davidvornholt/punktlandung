import { describe, expect, it, mock } from 'bun:test';
import type { ReactElement } from 'react';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ListenMutation } from '#/shared/ui/listen-mutation.ts';
import type { NoteMitFach } from '../services/noten-service.ts';
import { NotenKarten } from './noten-karten.tsx';

const gewichtung = {
  kindWeights: {
    gfs: 1,
    klausur: 1,
    muendlich: 1,
    sonstige: 1,
    test: 1,
  },
  writtenShare: null,
} as const;

const note = (id: string, datum = '2026-01-01'): NoteMitFach => ({
  area: 'schriftlich',
  datum,
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung,
  id,
  kind: 'klausur',
  notiz: `Notiz ${id}`,
  wert: 2,
});

const ruhend = {
  error: null,
  isError: false,
  isPending: false,
  variables: undefined,
};

const noten = [note('A'), note('B', '2026-02-02')] as const;

const karten = (
  bearbeitungId: string | null,
  aenderung: ListenMutation<string> = ruhend,
) =>
  renderToStaticMarkup(
    <NotenKarten
      aenderung={aenderung}
      bearbeitungId={bearbeitungId}
      formular={<p>Formular</p>}
      loeschung={ruhend}
      noten={noten}
      onBearbeiten={() => undefined}
      onLoeschen={() => undefined}
      system="sechser"
    />,
  );

/** Sammelt die gerenderten Knöpfe samt ihrer Eigenschaften. */
const knoepfe = (knoten: unknown): ReadonlyArray<ReactElement> => {
  if (Array.isArray(knoten)) {
    return knoten.flatMap(knoepfe);
  }
  if (!isValidElement(knoten)) {
    return [];
  }
  const eigenschaften = knoten.props as { readonly children?: unknown };
  if (typeof knoten.type === 'function') {
    const komponente = knoten.type as (props: unknown) => unknown;
    return knoepfe(komponente(knoten.props));
  }
  return [
    ...(knoten.type === 'button' ? [knoten] : []),
    ...knoepfe(eigenschaften.children),
  ];
};

const bearbeitenKnopf = (
  bearbeitungId: string | null,
  aufBearbeiten: unknown,
) =>
  knoepfe(
    NotenKarten({
      aenderung: ruhend,
      bearbeitungId,
      formular: null,
      loeschung: ruhend,
      noten: [note('A')],
      onBearbeiten: aufBearbeiten as (
        note: NoteMitFach | null,
        ausloeser: HTMLButtonElement,
      ) => void,
      onLoeschen: () => undefined,
      system: 'sechser',
    }),
  )[0]?.props as {
    readonly onClick: (ereignis: {
      readonly currentTarget: HTMLButtonElement;
    }) => void;
  };

describe('NotenKarten', () => {
  it('zeigt das Formular unter der bearbeiteten Note', () => {
    const markup = karten('A');

    expect(markup.indexOf('Formular')).toBeGreaterThan(
      markup.indexOf('Notiz A'),
    );
    expect(markup.indexOf('Formular')).toBeLessThan(markup.indexOf('Notiz B'));
    expect(markup.match(/Formular/gu)).toHaveLength(1);
  });

  it('blendet Löschen nur für die Note aus, die gerade bearbeitet wird', () => {
    expect(karten('A').match(/>Löschen</gu)).toHaveLength(1);
    expect(karten(null).match(/>Löschen</gu)).toHaveLength(2);
  });

  it('bietet jede Note zum Bearbeiten an', () => {
    expect(karten(null).match(/>Bearbeiten</gu)).toHaveLength(2);
  });

  it('benennt die Aktionen jeder Zeile mit ihrer Note', () => {
    const markup = karten(null);

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
    const markup = karten('A');

    expect(markup).toContain('aria-controls="notenformular-A"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('id="notenformular-A"');
    expect(markup.match(/aria-expanded="false"/gu)).toHaveLength(1);
    expect(markup).not.toContain('disabled=""');
  });

  it('meldet eine gescheiterte Änderung in der Zeile, deren Formular schon zu ist', () => {
    const gescheitert: ListenMutation<string> = {
      error: new Error('Verbindung weg'),
      isError: true,
      isPending: false,
      variables: 'A',
    };
    const markup = karten(null, gescheitert);

    expect(markup.match(/role="alert"/gu)).toHaveLength(1);
    expect(markup.indexOf('role="alert"')).toBeGreaterThan(
      markup.indexOf('Notiz A'),
    );
    expect(markup.indexOf('role="alert"')).toBeLessThan(
      markup.indexOf('Notiz B'),
    );
    expect(markup).toContain('Die Änderung an dieser Note wurde nicht');
    expect(karten('A', gescheitert)).not.toContain('role="alert"');
  });

  it('öffnet mit dem Auslöser die geschlossene Zeile', () => {
    const ausloeser = {} as HTMLButtonElement;
    const aufBearbeiten = mock(
      (_note: NoteMitFach | null, _ausloeser: HTMLButtonElement) => undefined,
    );

    bearbeitenKnopf(null, aufBearbeiten).onClick({ currentTarget: ausloeser });

    expect(aufBearbeiten).toHaveBeenCalledWith(note('A'), ausloeser);
  });

  it('schließt die offene Zeile, statt sie wirkungslos erneut zu öffnen', () => {
    const ausloeser = {} as HTMLButtonElement;
    const aufBearbeiten = mock(
      (_note: NoteMitFach | null, _ausloeser: HTMLButtonElement) => undefined,
    );

    bearbeitenKnopf('A', aufBearbeiten).onClick({ currentTarget: ausloeser });

    expect(aufBearbeiten).toHaveBeenCalledWith(null, ausloeser);
  });
});
