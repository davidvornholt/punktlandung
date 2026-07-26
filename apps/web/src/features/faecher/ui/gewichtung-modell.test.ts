import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { GewichtungAction } from './gewichtung-modell.ts';
import {
  gewichtungReducer,
  gewichtungStateFrom,
  gewichtWirkt,
  verhaeltnisGueltig,
} from './gewichtung-modell.ts';

const nach = (aktionen: ReadonlyArray<GewichtungAction>) =>
  aktionen.reduce(gewichtungReducer, gewichtungStateFrom(standardgewichtung));

describe('Gewichtungseditor', () => {
  it('erkennt die verkündeten Regeln in einer gespeicherten Gewichtung', () => {
    const zustand = gewichtungStateFrom(standardgewichtung);

    expect(zustand.gfsFolgtKlausur).toBe(true);
    expect(zustand.testsFolgenKlausur).toBe(true);
    expect(zustand.sonstigeFolgtMuendlich).toBe(true);
  });

  it('holt eine gespeicherte Sammlung zurück, die das Formular nicht anbietet', () => {
    const zustand = gewichtungStateFrom({
      ...standardgewichtung,
      arten: {
        ...standardgewichtung.arten,
        klausur: { gewicht: 1, sammlung: 'gesammelt' },
      },
    });

    expect(zustand.gewichtung.arten.klausur.sammlung).toBe('einzeln');
  });

  it('zieht die GFS mit, solange sie wie eine Klausur zählt', () => {
    const mitgezogen = nach([{ typ: 'gewicht', kind: 'klausur', wert: 2 }]);
    expect(mitgezogen.gewichtung.arten.gfs.gewicht).toBe(2);

    const geloest = nach([
      { typ: 'kopplung', kind: 'gfs', gekoppelt: false },
      { typ: 'gewicht', kind: 'klausur', wert: 3 },
    ]);
    expect(geloest.gewichtung.arten.gfs.gewicht).toBe(1);
  });

  it('holt die GFS beim erneuten Ankoppeln zurück auf die Klausur', () => {
    const zustand = nach([
      { typ: 'kopplung', kind: 'gfs', gekoppelt: false },
      { typ: 'gewicht', kind: 'gfs', wert: 0.5 },
      { typ: 'kopplung', kind: 'gfs', gekoppelt: true },
    ]);

    expect(zustand.gewichtung.arten.gfs).toEqual(
      zustand.gewichtung.arten.klausur,
    );
  });

  it('hält die Tests auf der Klausur, solange sie zusammen wie eine zählen', () => {
    const mitgezogen = nach([{ typ: 'gewicht', kind: 'klausur', wert: 2 }]);
    expect(mitgezogen.gewichtung.arten.test).toEqual({
      gewicht: 2,
      sammlung: 'gesammelt',
    });

    const einzeln = nach([
      { typ: 'kopplung', kind: 'test', gekoppelt: false },
      { typ: 'gewicht', kind: 'test', wert: 0.5 },
    ]);
    expect(einzeln.gewichtung.arten.test).toEqual({
      gewicht: 0.5,
      sammlung: 'einzeln',
    });
  });

  it('behält die Arten beim Wechsel zwischen Liste und Verhältnis', () => {
    const zustand = nach([
      { typ: 'gewicht', kind: 'klausur', wert: 2 },
      { typ: 'aufteilung', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
    ]);

    expect(zustand.gewichtung.verhaeltnis).toEqual({
      schriftlich: 3,
      muendlich: 1,
    });
    expect(zustand.gewichtung.arten.klausur.gewicht).toBe(2);
    expect(zustand.gewichtung.arten.gfs.gewicht).toBe(2);
  });

  it('ändert Anteile nur, wenn ein Verhältnis verkündet ist', () => {
    const ohneVerhaeltnis = nach([
      { typ: 'anteil', bereich: 'schriftlich', wert: 70 },
    ]);
    expect(ohneVerhaeltnis.gewichtung.verhaeltnis).toBeNull();

    const mitVerhaeltnis = nach([
      { typ: 'aufteilung', verhaeltnis: { schriftlich: 1, muendlich: 1 } },
      { typ: 'anteil', bereich: 'schriftlich', wert: 70 },
    ]);
    expect(mitVerhaeltnis.gewichtung.verhaeltnis).toEqual({
      schriftlich: 70,
      muendlich: 1,
    });
  });

  it('bietet ein Gewicht nur an, wo es den Schnitt verschieben kann', () => {
    const ohneVerhaeltnis = gewichtungStateFrom(standardgewichtung);
    expect(gewichtWirkt('klausur', ohneVerhaeltnis)).toBe(true);
    expect(gewichtWirkt('muendlich', ohneVerhaeltnis)).toBe(true);

    // Mit Verhältnis ist der Anteil je Bereich verkündet; solange alle Arten
    // eines Bereichs ihrem Vorbild folgen, skaliert ein Gewicht nur den
    // ganzen Bereich und ändert am Schnitt nichts.
    const gekoppelt = nach([
      { typ: 'aufteilung', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
    ]);
    expect(gewichtWirkt('klausur', gekoppelt)).toBe(false);
    expect(gewichtWirkt('muendlich', gekoppelt)).toBe(false);

    const sonstigeFrei = nach([
      { typ: 'aufteilung', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
      { typ: 'kopplung', kind: 'sonstige', gekoppelt: false },
    ]);
    expect(gewichtWirkt('muendlich', sonstigeFrei)).toBe(true);
    expect(gewichtWirkt('klausur', sonstigeFrei)).toBe(false);

    const testsEinzeln = nach([
      { typ: 'aufteilung', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
      { typ: 'kopplung', kind: 'test', gekoppelt: false },
    ]);
    expect(gewichtWirkt('klausur', testsEinzeln)).toBe(true);
  });

  it('weist ein Verhältnis zurück, in dem kein Bereich zählt', () => {
    const leer = nach([
      { typ: 'aufteilung', verhaeltnis: { schriftlich: 0, muendlich: 0 } },
    ]);

    expect(verhaeltnisGueltig(leer.gewichtung)).toBe(false);
    expect(verhaeltnisGueltig(standardgewichtung)).toBe(true);
  });
});
