/**
 * Die Schlüssel des Abfragespeichers. Sie liegen hier und nicht in den
 * Features, weil eine Änderung in einem Feature die Abfragen eines anderen
 * veralten lässt: eine geänderte Note verändert auch die Zeugnisvorschau.
 * Features dürfen einander nicht importieren, also gehört der gemeinsame
 * Schlüssel in die geteilte Schicht statt als Kopie in jedes Feature.
 */
export const notenSchluessel = (termId: string) => ['noten', termId] as const;

export const verlaufSchluessel = ['verlauf'] as const;

export const zeugnisSchluessel = (termId: string) =>
  ['zeugnis', termId] as const;
