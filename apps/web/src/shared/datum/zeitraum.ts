/** Begrenzt ein ISO-Kalenderdatum auf einen inklusiven ISO-Zeitraum. */
export const begrenzeIsoDatum = (
  datum: string,
  startsOn: string,
  endsOn: string,
): string => {
  if (datum < startsOn) {
    return startsOn;
  }
  if (datum > endsOn) {
    return endsOn;
  }
  return datum;
};

export const istIsoDatumImZeitraum = (
  datum: string,
  startsOn: string,
  endsOn: string,
): boolean => startsOn <= datum && datum <= endsOn;
