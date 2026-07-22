import { describe, expect, it } from 'bun:test';

import type { ListenMutation } from './listen-mutation.ts';
import { listenMutationsanzeige } from './listen-mutation.ts';

const verzoegerteAblehnung = () => {
  let ablehnen: (fehler: unknown) => void = () => undefined;
  const ergebnis = new Promise<void>((_aufloesen, ablehnung) => {
    ablehnen = ablehnung;
  });
  return { ablehnen, ergebnis };
};

describe('listenMutationsanzeige', () => {
  for (const muster of ['Notenliste', 'FachListe']) {
    it(`${muster}: sperrt B, solange A aussteht, und meldet As späteren Fehler`, async () => {
      const verzoegerung = verzoegerteAblehnung();
      let zustand: ListenMutation<string> = {
        error: null,
        isError: false,
        isPending: false,
        variables: undefined,
      };
      const fehler = new Error('A ist fehlgeschlagen');

      const laufVonA = (async () => {
        zustand = {
          error: null,
          isError: false,
          isPending: true,
          variables: 'A',
        };
        try {
          await verzoegerung.ergebnis;
        } catch (ursache) {
          zustand = {
            error: ursache,
            isError: true,
            isPending: false,
            variables: 'A',
          };
        }
      })();

      const anzeigeVonA = listenMutationsanzeige(zustand, 'A');
      const anzeigeVonB = listenMutationsanzeige(zustand, 'B');
      expect(anzeigeVonA).toEqual({
        fehler: null,
        gesperrt: true,
        laeuft: true,
      });
      expect(anzeigeVonB).toEqual({
        fehler: null,
        gesperrt: true,
        laeuft: false,
      });

      verzoegerung.ablehnen(fehler);
      await laufVonA;
      expect(listenMutationsanzeige(zustand, 'A').fehler).toBe(fehler);
      expect(listenMutationsanzeige(zustand, 'B').fehler).toBeNull();
    });
  }
});
