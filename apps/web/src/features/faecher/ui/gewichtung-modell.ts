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
export type Kopplungsart = 'gfs' | 'test' | 'sonstige';

/**
 * Zustand des Gewichtungseditors. Die Kopplungen stehen bewusst neben der
 * Gewichtung statt in ihr: gespeichert wird eine flache Form, die die
 * Notenmathematik ohne Sonderfälle liest. Solange eine Kopplung aktiv ist,
 * folgt die Art ihrem Vorbild bei jeder Änderung.
 */
export type GewichtungState = {
  readonly gewichtung: Fachgewichtung;
  readonly gfsFolgtKlausur: boolean;
  readonly testsFolgenKlausur: boolean;
  readonly sonstigeFolgtMuendlich: boolean;
};

export type GewichtungAction =
  | {
      readonly typ: 'aufteilung';
      readonly verhaeltnis: Bereichsverhaeltnis | null;
    }
  | {
      readonly typ: 'anteil';
      readonly bereich: Wertungsbereich;
      readonly wert: number;
    }
  | {
      readonly typ: 'gewicht';
      readonly kind: Leistungsart;
      readonly wert: number;
    }
  | {
      readonly typ: 'kopplung';
      readonly kind: Kopplungsart;
      readonly gekoppelt: boolean;
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
        gfs: state.gfsFolgtKlausur ? klausur : einzeln(arten.gfs),
        test: state.testsFolgenKlausur
          ? { ...klausur, sammlung: 'gesammelt' }
          : einzeln(arten.test),
        sonstige: state.sonstigeFolgtMuendlich
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
    gfsFolgtKlausur: gfsZaehltWieKlausur(gewichtung),
    testsFolgenKlausur: testsZaehlenWieEineKlausur(gewichtung),
    sonstigeFolgtMuendlich: sonstigeZaehltWieMuendlich(gewichtung),
  });

/**
 * Setzt eine Kopplung. Die Kette endet unbedingt beim Test: käme eine neue
 * Kopplungsart hinzu, ohne hier behandelt zu werden, fiele sie in diesen
 * Zweig und der Typcheck bräche.
 */
const coupling = (
  state: GewichtungState,
  kind: Kopplungsart,
  gekoppelt: boolean,
): GewichtungState => {
  if (kind === 'gfs') {
    return { ...state, gfsFolgtKlausur: gekoppelt };
  }
  if (kind === 'sonstige') {
    return { ...state, sonstigeFolgtMuendlich: gekoppelt };
  }
  return { ...state, testsFolgenKlausur: gekoppelt };
};

/** Wendet eine Aktion an; die Kette endet ebenso unbedingt bei der Kopplung. */
const applied = (
  state: GewichtungState,
  action: GewichtungAction,
): GewichtungState => {
  const { gewichtung } = state;
  if (action.typ === 'aufteilung') {
    return {
      ...state,
      gewichtung: { ...gewichtung, verhaeltnis: action.verhaeltnis },
    };
  }
  if (action.typ === 'anteil') {
    return gewichtung.verhaeltnis === null
      ? state
      : {
          ...state,
          gewichtung: {
            ...gewichtung,
            verhaeltnis: {
              ...gewichtung.verhaeltnis,
              [action.bereich]: action.wert,
            },
          },
        };
  }
  if (action.typ === 'gewicht') {
    return {
      ...state,
      gewichtung: withArt(gewichtung, action.kind, { gewicht: action.wert }),
    };
  }
  return coupling(state, action.kind, action.gekoppelt);
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
const bereichBeweglich = (
  bereich: Wertungsbereich,
  state: GewichtungState,
): boolean =>
  bereich === 'schriftlich'
    ? !(state.gfsFolgtKlausur && state.testsFolgenKlausur)
    : !state.sonstigeFolgtMuendlich;

/**
 * Ob ein eigenes Gewicht für diese Art am Schnitt etwas ändern kann. Ohne
 * Verhältnis stehen alle Arten in einer Liste und wirken immer. Mit Verhältnis
 * ist der Anteil des Bereichs bereits verkündet — dann verteilt ein Gewicht
 * nur noch innerhalb des Bereichs, und das setzt dort zwei voneinander
 * unabhängige Arten voraus. Das Formular blendet ein wirkungsloses Gewicht
 * aus, statt ein Bedienelement anzubieten, das nichts tut.
 */
export const gewichtWirkt = (
  kind: Leistungsart,
  state: GewichtungState,
): boolean =>
  state.gewichtung.verhaeltnis === null ||
  bereichBeweglich(bereichDerLeistungsart[kind], state);

/** Ein Verhältnis, in dem kein Bereich zählt, ergibt keinen Schnitt. */
export const verhaeltnisGueltig = (gewichtung: Fachgewichtung): boolean =>
  gewichtung.verhaeltnis === null ||
  gewichtung.verhaeltnis.schriftlich + gewichtung.verhaeltnis.muendlich > 0;
