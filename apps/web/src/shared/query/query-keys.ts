/**
 * Die Schlüssel des Abfragespeichers. Sie liegen hier und nicht in den
 * Features, weil eine Änderung in einem Feature die Abfragen eines anderen
 * veralten lässt: eine geänderte Note verändert auch die Zeugnisvorschau.
 * Features dürfen einander nicht importieren, also gehört der gemeinsame
 * Schlüssel in die geteilte Schicht statt als Kopie in jedes Feature.
 *
 * Zu jedem Schlüssel mit Kennung gehört sein Präfix: der Abfragespeicher
 * trifft über das Präfix jeden Eintrag darunter. Das brauchen Änderungen,
 * deren Wirkung über die eine Kennung hinausgeht, die sie kennen.
 */
export const notenKeyPrefix = ['noten'] as const;

export const notenKey = (halbjahrId: string) =>
  [...notenKeyPrefix, halbjahrId] as const;

export const trendKey = ['trend'] as const;

/**
 * Die Zeugnisvorschau eines Halbjahrs enthält die Jahresvorschau, die aus den
 * Noten beider Halbjahre des Schuljahrs entsteht. Eine geänderte Note veraltet
 * deshalb auch die Zeugnisabfrage des Geschwisterhalbjahrs.
 */
export const zeugnisKeyPrefix = ['zeugnis'] as const;

export const zeugnisKey = (halbjahrId: string) =>
  [...zeugnisKeyPrefix, halbjahrId] as const;

export const faecherKey = (schoolYear: string) =>
  ['faecher', schoolYear] as const;
