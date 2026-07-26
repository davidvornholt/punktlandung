/** Begrenzt ein ISO-Kalenderdatum auf einen inklusiven ISO-Zeitraum. */
export const clampIsoDate = (
  date: string,
  startsOn: string,
  endsOn: string,
): string => {
  if (date < startsOn) {
    return startsOn;
  }
  if (date > endsOn) {
    return endsOn;
  }
  return date;
};

export const isIsoDateInRange = (
  date: string,
  startsOn: string,
  endsOn: string,
): boolean => startsOn <= date && date <= endsOn;
