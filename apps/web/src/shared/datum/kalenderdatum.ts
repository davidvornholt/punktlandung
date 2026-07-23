const berlinZeitzone = 'Europe/Berlin';

const kalenderFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  timeZone: berlinZeitzone,
  year: 'numeric',
});

/** Liefert das bürgerliche Kalenderdatum am Einsatzort der App. */
export const berlinKalenderdatum = (zeitpunkt: Date = new Date()): string => {
  const teile = kalenderFormat.formatToParts(zeitpunkt);
  const wert = (typ: Intl.DateTimeFormatPartTypes) =>
    teile.find((teil) => teil.type === typ)?.value ?? '';
  return `${wert('year')}-${wert('month')}-${wert('day')}`;
};
