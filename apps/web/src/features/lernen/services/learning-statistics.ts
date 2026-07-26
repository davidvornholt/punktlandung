export type LearningStatistics = {
  /** Anzahl unterschiedlicher Lerntage im Monat von `heute`. */
  readonly tageDiesenMonat: number;
  /** Aktuelle Serie zusammenhängender Lerntage (heute darf noch offen sein). */
  readonly serie: number;
};

const monthLength = '0000-00'.length;

const previousDay = (isoDay: string): string => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, '0000-00-00'.length);
};

/**
 * Berechnet Monatszahl und Serie aus einer Liste eindeutiger Lerntage.
 * Die Serie zählt rückwärts ab heute; hat der heutige Tag noch keinen
 * Eintrag, zählt sie ab gestern weiter — der Tag ist ja noch nicht vorbei.
 */
export const calculateLearningStatistics = (
  days: ReadonlyArray<string>,
  today: string,
): LearningStatistics => {
  const month = today.slice(0, monthLength);
  const unique = new Set(days);
  const tageDiesenMonat = [...unique].filter(
    (day) => day.slice(0, monthLength) === month,
  ).length;

  let serie = 0;
  let expected = unique.has(today) ? today : previousDay(today);
  while (unique.has(expected)) {
    serie += 1;
    expected = previousDay(expected);
  }
  return { tageDiesenMonat, serie };
};
