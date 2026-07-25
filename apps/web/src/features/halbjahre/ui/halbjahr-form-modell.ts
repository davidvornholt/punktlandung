import type { Klassenstufe } from '#/shared/schule/klassenstufe.ts';
import { naechsteKlassenstufe } from '#/shared/schule/klassenstufe.ts';
import {
  halbjahrZeitraum,
  halbjahrZumDatum,
  naechstesSchuljahr,
  schuljahrZumDatum,
} from '#/shared/schule/schuljahr.ts';
import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';

/**
 * Editierbarer Formularzustand. Notensystem und Bezeichnung sind vollständig
 * abgeleitet; der Zeitraum folgt den amtlichen Grenzen, solange ihn niemand
 * ausdrücklich angepasst hat.
 */
export type HalbjahrFormWerte = {
  readonly klassenstufe: Klassenstufe;
  readonly schoolYear: string;
  readonly half: 1 | 2;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly zeitraumAngepasst: boolean;
};

const belegungsschluessel = (halbjahr: {
  readonly schoolYear: string;
  readonly half: number;
}) => `${halbjahr.schoolYear}\u0000${halbjahr.half}`;

/** Schuljahr-und-Halbjahr-Kombinationen, die bereits vergeben sind. */
export const belegteHalbjahre = (
  halbjahre: ReadonlyArray<Halbjahr>,
  ausgenommen: Halbjahr | null,
): ReadonlySet<string> =>
  new Set(
    halbjahre
      .filter((halbjahr) => halbjahr.id !== ausgenommen?.id)
      .map(belegungsschluessel),
  );

export const istBelegt = (
  belegt: ReadonlySet<string>,
  schoolYear: string,
  half: 1 | 2,
): boolean => belegt.has(belegungsschluessel({ schoolYear, half }));

const zuletztBegonnen = (halbjahre: ReadonlyArray<Halbjahr>): Halbjahr | null =>
  halbjahre.reduce<Halbjahr | null>(
    (spaetestes, halbjahr) =>
      spaetestes === null || halbjahr.startsOn > spaetestes.startsOn
        ? halbjahr
        : spaetestes,
    null,
  );

const mitAmtlichemZeitraum = (werte: {
  readonly klassenstufe: Klassenstufe;
  readonly schoolYear: string;
  readonly half: 1 | 2;
}): HalbjahrFormWerte => ({
  ...werte,
  ...halbjahrZeitraum(werte.schoolYear, werte.half),
  zeitraumAngepasst: false,
});

/**
 * Vorschlag für ein neues Halbjahr: das auf das zuletzt begonnene folgende.
 * Ohne Bestand entscheidet das heutige Datum über Schuljahr und Halbjahr.
 */
export const neuesHalbjahrVorschlag = (
  halbjahre: ReadonlyArray<Halbjahr>,
  heute: string,
): HalbjahrFormWerte => {
  const letztes = zuletztBegonnen(halbjahre);
  if (letztes === null) {
    return mitAmtlichemZeitraum({
      klassenstufe: '5',
      schoolYear: schuljahrZumDatum(heute),
      half: halbjahrZumDatum(heute),
    });
  }
  if (letztes.half === 1) {
    return mitAmtlichemZeitraum({
      klassenstufe: letztes.klassenstufe,
      schoolYear: letztes.schoolYear,
      half: 2,
    });
  }
  return mitAmtlichemZeitraum({
    klassenstufe:
      naechsteKlassenstufe(letztes.klassenstufe) ?? letztes.klassenstufe,
    schoolYear: naechstesSchuljahr(letztes.schoolYear),
    half: 1,
  });
};

/** Ausgangszustand des Formulars für Anlegen oder Bearbeiten. */
export const halbjahrFormWerte = (
  halbjahr: Halbjahr | null,
  halbjahre: ReadonlyArray<Halbjahr>,
  heute: string,
): HalbjahrFormWerte => {
  if (halbjahr === null) {
    return neuesHalbjahrVorschlag(halbjahre, heute);
  }
  const amtlich = halbjahrZeitraum(halbjahr.schoolYear, halbjahr.half);
  return {
    klassenstufe: halbjahr.klassenstufe,
    schoolYear: halbjahr.schoolYear,
    half: halbjahr.half,
    startsOn: halbjahr.startsOn,
    endsOn: halbjahr.endsOn,
    zeitraumAngepasst:
      halbjahr.startsOn !== amtlich.startsOn ||
      halbjahr.endsOn !== amtlich.endsOn,
  };
};

/**
 * Zieht Schuljahr- oder Halbjahreswechsel in den Zeitraum nach, solange dieser
 * nicht von Hand angepasst wurde.
 */
export const mitAktualisiertemZeitraum = (
  werte: HalbjahrFormWerte,
): HalbjahrFormWerte =>
  werte.zeitraumAngepasst
    ? werte
    : { ...werte, ...halbjahrZeitraum(werte.schoolYear, werte.half) };

/** Der zu speichernde Datensatz; das Notensystem leitet der Server ab. */
export const zuHalbjahrEingabe = (
  werte: HalbjahrFormWerte,
): HalbjahrEingabe => ({
  klassenstufe: werte.klassenstufe,
  schoolYear: werte.schoolYear,
  half: werte.half,
  startsOn: werte.startsOn,
  endsOn: werte.endsOn,
});
