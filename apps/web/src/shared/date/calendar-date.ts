const berlinTimeZone = 'Europe/Berlin';

const calendarFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  timeZone: berlinTimeZone,
  year: 'numeric',
});

/** Liefert das bürgerliche Kalenderdatum am Einsatzort der App. */
export const berlinCalendarDate = (instant: Date = new Date()): string => {
  const parts = calendarFormat.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

/** Formatiert ein ISO-Kalenderdatum deutsch: "2026-08-01" wird zu "01.08.2026". */
export const formatIsoDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return year === undefined || month === undefined || day === undefined
    ? isoDate
    : `${day}.${month}.${year}`;
};
