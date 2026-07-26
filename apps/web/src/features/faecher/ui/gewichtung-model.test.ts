import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';

import {
  FachgewichtungSchema,
  standardgewichtung,
} from '#/shared/noten/fach-gewichtung.ts';
import type { GewichtungAction } from './gewichtung-model.ts';
import {
  gewichtungAffectsAverage,
  gewichtungReducer,
  gewichtungStateFrom,
  isVerhaeltnisValid,
} from './gewichtung-model.ts';

const reduceActions = (actions: ReadonlyArray<GewichtungAction>) =>
  actions.reduce(gewichtungReducer, gewichtungStateFrom(standardgewichtung));

describe('Gewichtungseditor', () => {
  it('erkennt die verkündeten Regeln in einer gespeicherten Gewichtung', () => {
    const state = gewichtungStateFrom(standardgewichtung);

    expect(state.gfsFollowsKlausur).toBe(true);
    expect(state.testsFollowKlausur).toBe(true);
    expect(state.sonstigeFollowsMuendlich).toBe(true);
  });

  it('holt eine gespeicherte Sammlung zurück, die das Formular nicht anbietet', () => {
    const state = gewichtungStateFrom({
      ...standardgewichtung,
      arten: {
        ...standardgewichtung.arten,
        klausur: { gewicht: 1, sammlung: 'gesammelt' },
      },
    });

    expect(state.gewichtung.arten.klausur.sammlung).toBe('einzeln');
  });

  it('zieht die GFS mit, solange sie wie eine Klausur zählt', () => {
    const updated = reduceActions([
      { type: 'weight', kind: 'klausur', value: 2 },
    ]);
    expect(updated.gewichtung.arten.gfs.gewicht).toBe(2);

    const uncoupled = reduceActions([
      { type: 'coupling', kind: 'gfs', coupled: false },
      { type: 'weight', kind: 'klausur', value: 3 },
    ]);
    expect(uncoupled.gewichtung.arten.gfs.gewicht).toBe(1);
  });
});

describe('Gewichtungseditor-Persistenz', () => {
  it('bewahrt beliebige gültige Testgewichte beim Öffnen unverändert', () => {
    for (const gewicht of [0.25, 3.75, 10] as const) {
      for (const sammlung of ['einzeln', 'gesammelt'] as const) {
        const raw = {
          ...standardgewichtung,
          arten: {
            ...standardgewichtung.arten,
            klausur: {
              ...standardgewichtung.arten.klausur,
              gewicht: sammlung === 'gesammelt' ? gewicht : 1,
            },
            test: { gewicht, sammlung },
          },
        };
        const gewichtung = Schema.decodeUnknownSync(FachgewichtungSchema)(raw);

        expect(gewichtungStateFrom(gewichtung).gewichtung).toEqual(gewichtung);
      }
    }
  });

  it('weist gesammelte Tests mit abweichendem Gewicht vor dem Editor zurück', () => {
    for (const gewicht of [0.25, 3.75, 10] as const) {
      const raw = {
        ...standardgewichtung,
        arten: {
          ...standardgewichtung.arten,
          test: { gewicht, sammlung: 'gesammelt' },
        },
      };

      expect(Schema.decodeUnknownEither(FachgewichtungSchema)(raw)._tag).toBe(
        'Left',
      );
    }
  });

  it('holt die GFS beim erneuten Ankoppeln zurück auf die Klausur', () => {
    const state = reduceActions([
      { type: 'coupling', kind: 'gfs', coupled: false },
      { type: 'weight', kind: 'gfs', value: 0.5 },
      { type: 'coupling', kind: 'gfs', coupled: true },
    ]);

    expect(state.gewichtung.arten.gfs).toEqual(state.gewichtung.arten.klausur);
  });

  it('hält die Tests auf der Klausur, solange sie zusammen wie eine zählen', () => {
    const updated = reduceActions([
      { type: 'weight', kind: 'klausur', value: 2 },
    ]);
    expect(updated.gewichtung.arten.test).toEqual({
      gewicht: 2,
      sammlung: 'gesammelt',
    });

    const individual = reduceActions([
      { type: 'coupling', kind: 'test', coupled: false },
      { type: 'weight', kind: 'test', value: 0.5 },
    ]);
    expect(individual.gewichtung.arten.test).toEqual({
      gewicht: 0.5,
      sammlung: 'einzeln',
    });
  });

  it('behält die Arten beim Wechsel zwischen Liste und Verhältnis', () => {
    const state = reduceActions([
      { type: 'weight', kind: 'klausur', value: 2 },
      { type: 'ratio', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
    ]);

    expect(state.gewichtung.verhaeltnis).toEqual({
      schriftlich: 3,
      muendlich: 1,
    });
    expect(state.gewichtung.arten.klausur.gewicht).toBe(2);
    expect(state.gewichtung.arten.gfs.gewicht).toBe(2);
  });

  it('ändert Anteile nur, wenn ein Verhältnis verkündet ist', () => {
    const withoutVerhaeltnis = reduceActions([
      { type: 'share', bereich: 'schriftlich', value: 70 },
    ]);
    expect(withoutVerhaeltnis.gewichtung.verhaeltnis).toBeNull();

    const withVerhaeltnis = reduceActions([
      { type: 'ratio', verhaeltnis: { schriftlich: 1, muendlich: 1 } },
      { type: 'share', bereich: 'schriftlich', value: 70 },
    ]);
    expect(withVerhaeltnis.gewichtung.verhaeltnis).toEqual({
      schriftlich: 70,
      muendlich: 1,
    });
  });

  it('bietet ein Gewicht nur an, wo es den Schnitt verschieben kann', () => {
    const withoutVerhaeltnis = gewichtungStateFrom(standardgewichtung);
    expect(gewichtungAffectsAverage('klausur', withoutVerhaeltnis)).toBe(true);
    expect(gewichtungAffectsAverage('muendlich', withoutVerhaeltnis)).toBe(
      true,
    );

    // Mit Verhältnis ist der Anteil je Bereich verkündet; solange alle Arten
    // eines Bereichs ihrem Vorbild folgen, skaliert ein Gewicht nur den
    // ganzen Bereich und ändert am Schnitt nichts.
    const coupled = reduceActions([
      { type: 'ratio', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
    ]);
    expect(gewichtungAffectsAverage('klausur', coupled)).toBe(false);
    expect(gewichtungAffectsAverage('muendlich', coupled)).toBe(false);

    const sonstigeFree = reduceActions([
      { type: 'ratio', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
      { type: 'coupling', kind: 'sonstige', coupled: false },
    ]);
    expect(gewichtungAffectsAverage('muendlich', sonstigeFree)).toBe(true);
    expect(gewichtungAffectsAverage('klausur', sonstigeFree)).toBe(false);

    const individualTests = reduceActions([
      { type: 'ratio', verhaeltnis: { schriftlich: 3, muendlich: 1 } },
      { type: 'coupling', kind: 'test', coupled: false },
    ]);
    expect(gewichtungAffectsAverage('klausur', individualTests)).toBe(true);
  });

  it('weist ein Verhältnis zurück, in dem kein Bereich zählt', () => {
    const empty = reduceActions([
      { type: 'ratio', verhaeltnis: { schriftlich: 0, muendlich: 0 } },
    ]);

    expect(isVerhaeltnisValid(empty.gewichtung)).toBe(false);
    expect(isVerhaeltnisValid(standardgewichtung)).toBe(true);
  });
});
