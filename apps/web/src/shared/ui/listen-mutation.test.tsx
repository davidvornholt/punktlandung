import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Fach } from '#/features/faecher/services/fach-service.ts';
import { FachListe } from '#/features/faecher/ui/fach-liste.tsx';
import type { NoteMitFach } from '#/features/noten/services/noten-service.ts';
import { NotenKarten } from '#/features/noten/ui/noten-karten.tsx';
import type { ListenMutation } from './listen-mutation.ts';

const verzoegerteAblehnung = () => {
  let ablehnen: (fehler: unknown) => void = () => undefined;
  const ergebnis = new Promise<void>((_aufloesen, ablehnung) => {
    ablehnen = ablehnung;
  });
  return { ablehnen, ergebnis };
};

const fach = (id: string): Fach => ({
  gfsWeight: 1,
  id,
  klausurWeight: 1,
  muendlichWeight: 1,
  name: `Ziel ${id}`,
  shortName: id,
  sonstigeWeight: 1,
  sortOrder: id === 'A' ? 0 : 1,
  testWeight: 1,
  writtenShare: null,
});

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
  datum: id === 'A' ? '2026-01-01' : '2026-01-02',
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung,
  id,
  kind: 'klausur',
  notiz: `Ziel ${id}`,
  wert: 2,
});

const ausstehend: ListenMutation<string> = {
  error: null,
  isError: false,
  isPending: true,
  variables: 'A',
};

const fehlerposition = (markup: string) => ({
  alarm: markup.indexOf('role="alert"'),
  alarmAnzahl: markup.match(/role="alert"/gu)?.length ?? 0,
  zielA: markup.indexOf('Ziel A'),
  zielB: markup.indexOf('Ziel B'),
});

describe('geteilte Listenmutation in den verwendeten Komponenten', () => {
  it('FachListe sperrt B während A und kündigt As verzögerten Fehler an', async () => {
    const verzoegerung = verzoegerteAblehnung();
    const laufVonA = verzoegerung.ergebnis.catch((ursache: unknown) => ursache);
    const faecher = [fach('A'), fach('B')];
    const pendingMarkup = renderToStaticMarkup(
      <FachListe
        archivierung={ausstehend}
        faecher={faecher}
        onArchivieren={() => undefined}
        onBearbeiten={() => undefined}
      />,
    );

    expect(pendingMarkup.match(/disabled=""/gu)).toHaveLength(2);
    expect(pendingMarkup.match(/Wird archiviert …/gu)).toHaveLength(1);

    verzoegerung.ablehnen(new Error('A ist fehlgeschlagen'));
    const fehler = await laufVonA;
    const fehlerMarkup = renderToStaticMarkup(
      <FachListe
        archivierung={{
          error: fehler,
          isError: true,
          isPending: false,
          variables: 'A',
        }}
        faecher={faecher}
        onArchivieren={() => undefined}
        onBearbeiten={() => undefined}
      />,
    );
    const position = fehlerposition(fehlerMarkup);
    expect(position.zielA).toBeGreaterThanOrEqual(0);
    expect(position.alarm).toBeGreaterThan(position.zielA);
    expect(position.zielB).toBeGreaterThan(position.alarm);
    expect(position.alarmAnzahl).toBe(1);
  });

  it('NotenKarten sperrt B während A und kündigt As verzögerten Fehler an', async () => {
    const verzoegerung = verzoegerteAblehnung();
    const laufVonA = verzoegerung.ergebnis.catch((ursache: unknown) => ursache);
    const noten = [note('A'), note('B')];
    const pendingMarkup = renderToStaticMarkup(
      <NotenKarten
        loeschung={ausstehend}
        noten={noten}
        onLoeschen={() => undefined}
        system="sechser"
      />,
    );

    expect(pendingMarkup.match(/disabled=""/gu)).toHaveLength(2);
    expect(pendingMarkup.match(/Wird gelöscht …/gu)).toHaveLength(1);

    verzoegerung.ablehnen(new Error('A ist fehlgeschlagen'));
    const fehler = await laufVonA;
    const fehlerMarkup = renderToStaticMarkup(
      <NotenKarten
        loeschung={{
          error: fehler,
          isError: true,
          isPending: false,
          variables: 'A',
        }}
        noten={noten}
        onLoeschen={() => undefined}
        system="sechser"
      />,
    );
    const position = fehlerposition(fehlerMarkup);
    expect(position.zielA).toBeGreaterThanOrEqual(0);
    expect(position.alarm).toBeGreaterThan(position.zielA);
    expect(position.zielB).toBeGreaterThan(position.alarm);
    expect(position.alarmAnzahl).toBe(1);
  });
});
