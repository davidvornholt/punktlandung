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

/** Formatiert ein ISO-Kalenderdatum deutsch: "2026-08-01" wird zu "01.08.2026". */
export const formatiereIsoDatum = (isoDatum: string): string => {
  const [jahr, monat, tag] = isoDatum.split('-');
  return jahr === undefined || monat === undefined || tag === undefined
    ? isoDatum
    : `${tag}.${monat}.${jahr}`;
};
