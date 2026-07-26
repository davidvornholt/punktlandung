import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

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

const note = (id: string): NoteMitFach => ({
  area: 'schriftlich',
  datum: '2026-01-01',
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

const karten = (bearbeitungId: string | null) =>
  renderToStaticMarkup(
    <NotenKarten
      bearbeitungId={bearbeitungId}
      formular={<p>Formular</p>}
      loeschung={ruhend}
      noten={[note('A'), note('B')]}
      onBearbeiten={() => undefined}
      onLoeschen={() => undefined}
      system="sechser"
    />,
  );

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
    expect(karten('A').match(/Löschen/gu)).toHaveLength(1);
    expect(karten(null).match(/Löschen/gu)).toHaveLength(2);
  });

  it('bietet jede Note zum Bearbeiten an', () => {
    expect(karten(null).match(/Bearbeiten/gu)).toHaveLength(2);
  });
});
