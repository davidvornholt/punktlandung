/**
 * Schuljahr- und Halbjahresgrenzen in Baden-Württemberg. Das Schuljahr läuft
 * vom 1. August bis zum 31. Juli (§ 26 SchG BW), das erste Schulhalbjahr endet
 * am 31. Januar. Beide Halbjahre zusammen decken das Schuljahr lückenlos ab,
 * damit jedes Notendatum in genau ein Halbjahr fällt.
 */

/** Schuljahr im Format "2026/27". */
export const schuljahrMuster = /^\d{4}\/\d{2}$/u;

const jahresLaenge = 4;
const jahrhundert = 100;

export const istSchuljahr = (wert: string): boolean =>
  schuljahrMuster.test(wert);

/** Kalenderjahr, in dem das Schuljahr beginnt: 2026 für "2026/27". */
export const schuljahrBeginnjahr = (schuljahr: string): number =>
  Number(schuljahr.slice(0, jahresLaenge));

export const schuljahrAusBeginnjahr = (beginnjahr: number): string =>
  `${beginnjahr}/${`${(beginnjahr + 1) % jahrhundert}`.padStart(2, '0')}`;

const monatBeginn = 5;
const monatEnde = 7;

const monatAus = (isoDatum: string): number =>
  Number(isoDatum.slice(monatBeginn, monatEnde));

const erstesHalbjahrBeginntImMonat = 8;
const zweitesHalbjahrBeginntImMonat = 2;

/** Das Schuljahr, in das ein ISO-Kalenderdatum fällt. */
export const schuljahrZumDatum = (isoDatum: string): string => {
  const jahr = Number(isoDatum.slice(0, jahresLaenge));
  return schuljahrAusBeginnjahr(
    monatAus(isoDatum) >= erstesHalbjahrBeginntImMonat ? jahr : jahr - 1,
  );
};

/** Das Halbjahr, in das ein ISO-Kalenderdatum fällt. */
export const halbjahrZumDatum = (isoDatum: string): 1 | 2 => {
  const monat = monatAus(isoDatum);
  return monat >= zweitesHalbjahrBeginntImMonat &&
    monat < erstesHalbjahrBeginntImMonat
    ? 2
    : 1;
};

export const naechstesSchuljahr = (schuljahr: string): string =>
  schuljahrAusBeginnjahr(schuljahrBeginnjahr(schuljahr) + 1);

/** Amtlicher Zeitraum eines Halbjahrs innerhalb seines Schuljahrs. */
export const halbjahrZeitraum = (
  schuljahr: string,
  half: 1 | 2,
): { readonly startsOn: string; readonly endsOn: string } => {
  const beginn = schuljahrBeginnjahr(schuljahr);
  return half === 1
    ? { startsOn: `${beginn}-08-01`, endsOn: `${beginn + 1}-01-31` }
    : { startsOn: `${beginn + 1}-02-01`, endsOn: `${beginn + 1}-07-31` };
};

const rueckblickJahre = 4;
const ausblickJahre = 1;

/**
 * Auswahlfenster für das Schuljahr, neuestes zuerst: einige Jahre rückwirkend,
 * das kommende Schuljahr sowie jedes bereits erfasste Schuljahr.
 */
export const schuljahrAuswahl = (
  heute: string,
  erfasste: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const aktuell = schuljahrBeginnjahr(schuljahrZumDatum(heute));
  const fenster = Array.from(
    { length: rueckblickJahre + ausblickJahre + 1 },
    (_, versatz) => schuljahrAusBeginnjahr(aktuell - rueckblickJahre + versatz),
  );
  return [...new Set([...fenster, ...erfasste])].sort().reverse();
};
