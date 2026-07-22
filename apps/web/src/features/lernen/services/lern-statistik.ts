export type LernStatistik = {
  /** Anzahl unterschiedlicher Lerntage im Monat von `heute`. */
  readonly tageDiesenMonat: number;
  /** Aktuelle Serie zusammenhängender Lerntage (heute darf noch offen sein). */
  readonly serie: number;
};

const monatsLaenge = '0000-00'.length;

const vortag = (isoTag: string): string => {
  const datum = new Date(`${isoTag}T00:00:00Z`);
  datum.setUTCDate(datum.getUTCDate() - 1);
  return datum.toISOString().slice(0, '0000-00-00'.length);
};

/**
 * Berechnet Monatszahl und Serie aus einer Liste eindeutiger Lerntage.
 * Die Serie zählt rückwärts ab heute; hat der heutige Tag noch keinen
 * Eintrag, zählt sie ab gestern weiter — der Tag ist ja noch nicht vorbei.
 */
export const berechneLernStatistik = (
  tage: ReadonlyArray<string>,
  heute: string,
): LernStatistik => {
  const monat = heute.slice(0, monatsLaenge);
  const eindeutig = new Set(tage);
  const tageDiesenMonat = [...eindeutig].filter(
    (tag) => tag.slice(0, monatsLaenge) === monat,
  ).length;

  let serie = 0;
  let erwartet = eindeutig.has(heute) ? heute : vortag(heute);
  while (eindeutig.has(erwartet)) {
    serie += 1;
    erwartet = vortag(erwartet);
  }
  return { tageDiesenMonat, serie };
};
