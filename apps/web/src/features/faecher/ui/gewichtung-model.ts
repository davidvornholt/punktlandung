import {
  gfsZaehltWieKlausur,
  sonstigeZaehltWieMuendlich,
  testsZaehlenWieEineKlausur,
} from '#/shared/noten/fach-gewichtung.ts';
import type {
  Artgewichtung,
  Bereichsverhaeltnis,
  Fachgewichtung,
  Leistungsart,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import { bereichDerLeistungsart } from '#/shared/noten/notenwert.ts';

/** Eine Art, die einer anderen folgt, statt eigene Werte zu tragen. */
export type CouplingKind = 'gfs' | 'test' | 'sonstige';

/**
 * Zustand des Gewichtungseditors. Die Kopplungen stehen bewusst neben der
 * Gewichtung statt in ihr: gespeichert wird eine flache Form, die die
 * Notenmathematik ohne Sonderfälle liest. Solange eine Kopplung aktiv ist,
 * folgt die Art ihrem Vorbild bei jeder Änderung.
 */
export type GewichtungState = {
  readonly gewichtung: Fachgewichtung;
  readonly gfsFollowsKlausur: boolean;
  readonly testsFollowKlausur: boolean;
  readonly sonstigeFollowsMuendlich: boolean;
};

export type GewichtungAction =
  | {
      readonly type: 'ratio';
      readonly verhaeltnis: Bereichsverhaeltnis | null;
    }
  | {
      readonly type: 'share';
      readonly bereich: Wertungsbereich;
      readonly value: number;
    }
  | {
      readonly type: 'weight';
      readonly kind: Leistungsart;
      readonly value: number;
    }
  | {
      readonly type: 'coupling';
      readonly kind: CouplingKind;
      readonly coupled: boolean;
    };

const withArt = (
  gewichtung: Fachgewichtung,
  kind: Leistungsart,
  change: Partial<Fachgewichtung['arten'][Leistungsart]>,
): Fachgewichtung => ({
  ...gewichtung,
  arten: {
    ...gewichtung.arten,
    [kind]: { ...gewichtung.arten[kind], ...change },
  },
});

const einzeln = (art: Artgewichtung): Artgewichtung => ({
  ...art,
  sammlung: 'einzeln',
});

/**
 * Bringt die Arten auf die Form, die das Formular auch zeigen kann: gekoppelte
 * Arten folgen ihrem Vorbild, alle übrigen zählen einzeln. Gesammelt wird nur
 * der Test, und nur als verkündete Regel — eine andere gespeicherte Sammlung
 * wäre eine Gewichtung, die niemand mehr sehen oder ändern könnte.
 */
const normalized = (state: GewichtungState): GewichtungState => {
  const { arten } = state.gewichtung;
  const klausur = einzeln(arten.klausur);
  const muendlich = einzeln(arten.muendlich);
  return {
    ...state,
    gewichtung: {
      ...state.gewichtung,
      arten: {
        klausur,
        muendlich,
        gfs: state.gfsFollowsKlausur ? klausur : einzeln(arten.gfs),
        test: state.testsFollowKlausur
          ? { ...klausur, sammlung: 'gesammelt' }
          : einzeln(arten.test),
        sonstige: state.sonstigeFollowsMuendlich
          ? muendlich
          : einzeln(arten.sonstige),
      },
    },
  };
};

/**
 * Liest die verkündeten Regeln aus einer gespeicherten Gewichtung und
 * normalisiert sie sofort, damit der Editor nie etwas anderes zeigt, als er
 * beim nächsten Speichern schreiben würde.
 */
export const gewichtungStateFrom = (
  gewichtung: Fachgewichtung,
): GewichtungState =>
  normalized({
    gewichtung,
    gfsFollowsKlausur: gfsZaehltWieKlausur(gewichtung),
    testsFollowKlausur: testsZaehlenWieEineKlausur(gewichtung),
    sonstigeFollowsMuendlich: sonstigeZaehltWieMuendlich(gewichtung),
  });

/**
 * Setzt eine Kopplung. Die Kette endet unbedingt beim Test: käme eine neue
 * Kopplungsart hinzu, ohne hier behandelt zu werden, fiele sie in diesen
 * Zweig und der Typcheck bräche.
 */
const coupling = (
  state: GewichtungState,
  kind: CouplingKind,
  coupled: boolean,
): GewichtungState => {
  if (kind === 'gfs') {
    return { ...state, gfsFollowsKlausur: coupled };
  }
  if (kind === 'sonstige') {
    return { ...state, sonstigeFollowsMuendlich: coupled };
  }
  return { ...state, testsFollowKlausur: coupled };
};

/** Wendet eine Aktion an; die Kette endet ebenso unbedingt bei der Kopplung. */
const applied = (
  state: GewichtungState,
  action: GewichtungAction,
): GewichtungState => {
  const { gewichtung } = state;
  if (action.type === 'ratio') {
    return {
      ...state,
      gewichtung: { ...gewichtung, verhaeltnis: action.verhaeltnis },
    };
  }
  if (action.type === 'share') {
    return gewichtung.verhaeltnis === null
      ? state
      : {
          ...state,
          gewichtung: {
            ...gewichtung,
            verhaeltnis: {
              ...gewichtung.verhaeltnis,
              [action.bereich]: action.value,
            },
          },
        };
  }
  if (action.type === 'weight') {
    return {
      ...state,
      gewichtung: withArt(gewichtung, action.kind, {
        gewicht: action.value,
      }),
    };
  }
  return coupling(state, action.kind, action.coupled);
};

export const gewichtungReducer = (
  state: GewichtungState,
  action: GewichtungAction,
): GewichtungState => normalized(applied(state, action));

/**
 * Ob sich innerhalb eines Bereichs überhaupt etwas gegeneinander verschieben
 * lässt. Gekoppelte Arten wachsen im Gleichschritt mit ihrem Vorbild; solange
 * alle einem einzigen folgen, skaliert ein Gewicht den ganzen Bereich, und ein
 * gewichteter Schnitt ändert sich davon nicht.
 */
const isWertungsbereichFlexible = (
  bereich: Wertungsbereich,
  state: GewichtungState,
): boolean =>
  bereich === 'schriftlich'
    ? !(state.gfsFollowsKlausur && state.testsFollowKlausur)
    : !state.sonstigeFollowsMuendlich;

/**
 * Ob ein eigenes Gewicht für diese Art am Schnitt etwas ändern kann. Ohne
 * Verhältnis stehen alle Arten in einer Liste und wirken immer. Mit Verhältnis
 * ist der Anteil des Bereichs bereits verkündet — dann verteilt ein Gewicht
 * nur noch innerhalb des Bereichs, und das setzt dort zwei voneinander
 * unabhängige Arten voraus. Das Formular blendet ein wirkungsloses Gewicht
 * aus, statt ein Bedienelement anzubieten, das nichts tut.
 */
export const gewichtungAffectsAverage = (
  kind: Leistungsart,
  state: GewichtungState,
): boolean =>
  state.gewichtung.verhaeltnis === null ||
  isWertungsbereichFlexible(bereichDerLeistungsart[kind], state);

/** Ein Verhältnis, in dem kein Bereich zählt, ergibt keinen Schnitt. */
export const isVerhaeltnisValid = (gewichtung: Fachgewichtung): boolean =>
  gewichtung.verhaeltnis === null ||
  gewichtung.verhaeltnis.schriftlich + gewichtung.verhaeltnis.muendlich > 0;
