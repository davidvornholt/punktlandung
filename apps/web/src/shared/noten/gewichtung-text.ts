/**
 * Übersetzt eine Fachgewichtung zurück in die Sprache, in der Lehrkräfte sie
 * verkünden. Diese Sätze sind die eigentliche Erklärung der Gewichtung — im
 * Formular unter der Eingabe und in der Fachliste statt einer Zahlenreihe.
 */

import {
  gfsZaehltWieKlausur,
  sonstigeZaehltWieMuendlich,
  testsZaehlenWieEineKlausur,
} from './fach-gewichtung.ts';
import {
  leistungsartLabel,
  leistungsartPlural,
  leistungsartReihenfolge,
} from './leistungsart-text.ts';
import type {
  Artgewichtung,
  Bereichsverhaeltnis,
  Fachgewichtung,
  Leistungsart,
} from './notenwert.ts';

const prozentBasis = 100;

const zahl = (wert: number): string => `${wert}`.replace('.', ',');

/** Ganze Prozente, die sich stets zu 100 ergänzen. */
export const verhaeltnisProzent = (
  verhaeltnis: Bereichsverhaeltnis,
): Bereichsverhaeltnis => {
  const summe = verhaeltnis.schriftlich + verhaeltnis.muendlich;
  const schriftlich = Math.round(
    (verhaeltnis.schriftlich / summe) * prozentBasis,
  );
  return { schriftlich, muendlich: prozentBasis - schriftlich };
};

/** "60 % : 40 %" — die Kontrollanzeige neben der Verhältniseingabe. */
export const verhaeltnisProzentText = (
  verhaeltnis: Bereichsverhaeltnis,
): string => {
  const prozent = verhaeltnisProzent(verhaeltnis);
  return `${prozent.schriftlich} % : ${prozent.muendlich} %`;
};

const vielfache: Readonly<Record<string, string>> = {
  '1': 'einfach',
  '2': 'doppelt',
  '3': 'dreifach',
};

const gewichtsWort = (gewicht: number): string =>
  vielfache[`${gewicht}`] ?? `${zahl(gewicht)}-fach`;

const grundsatz = (kind: Leistungsart, art: Artgewichtung): string | null => {
  const plural = leistungsartPlural[kind];
  if (art.sammlung === 'gesammelt') {
    return art.gewicht === 1
      ? `alle ${plural} zusammen zählen wie eine Note`
      : `alle ${plural} zusammen zählen ${gewichtsWort(art.gewicht)}`;
  }
  return art.gewicht === 1
    ? null
    : `${plural} zählen ${gewichtsWort(art.gewicht)}`;
};

const sonderfall = (
  kind: Leistungsart,
  gewichtung: Fachgewichtung,
): string | null => {
  if (kind === 'test' && testsZaehlenWieEineKlausur(gewichtung)) {
    return `alle ${leistungsartPlural.test} zusammen zählen wie eine ${leistungsartLabel.klausur}`;
  }
  if (kind === 'gfs' && gfsZaehltWieKlausur(gewichtung)) {
    return `eine ${leistungsartLabel.gfs} zählt wie eine ${leistungsartLabel.klausur}`;
  }
  if (kind === 'sonstige' && sonstigeZaehltWieMuendlich(gewichtung)) {
    return 'Sonstiges zählt wie eine mündliche Note';
  }
  return null;
};

const artSatz = (
  kind: Leistungsart,
  gewichtung: Fachgewichtung,
): string | null =>
  sonderfall(kind, gewichtung) ?? grundsatz(kind, gewichtung.arten[kind]);

/**
 * Die Gewichtung als Folge kurzer Aussagen. Der erste Satz nennt immer die
 * Aufteilung; danach steht nur, was von "jede Note zählt einfach" abweicht.
 */
export const gewichtungsSaetze = (
  gewichtung: Fachgewichtung,
): ReadonlyArray<string> => {
  const prozent =
    gewichtung.verhaeltnis === null
      ? null
      : verhaeltnisProzent(gewichtung.verhaeltnis);
  const aufteilung =
    prozent === null
      ? 'Eine gemeinsame Liste'
      : `Schriftlich ${prozent.schriftlich} % : mündlich ${prozent.muendlich} %`;
  const weitere = leistungsartReihenfolge.flatMap((kind) => {
    const satz = artSatz(kind, gewichtung);
    return satz === null ? [] : [satz];
  });
  return [aufteilung, ...weitere];
};

/** Einzeiler für die Fachliste. */
export const gewichtungsZeile = (gewichtung: Fachgewichtung): string =>
  gewichtungsSaetze(gewichtung).join(' · ');
