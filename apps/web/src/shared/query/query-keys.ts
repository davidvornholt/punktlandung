/**
 * Die Schlüssel des Abfragespeichers. Sie liegen hier und nicht in den
 * Features, weil eine Änderung in einem Feature die Abfragen eines anderen
 * veralten lässt: eine geänderte Note verändert auch die Zeugnisvorschau.
 * Features dürfen einander nicht importieren, also gehört der gemeinsame
 * Schlüssel in die geteilte Schicht statt als Kopie in jedes Feature.
 */
export const notenKey = (halbjahrId: string) => ['noten', halbjahrId] as const;

export const trendKey = ['trend'] as const;

export const zeugnisKey = (halbjahrId: string) =>
  ['zeugnis', halbjahrId] as const;
