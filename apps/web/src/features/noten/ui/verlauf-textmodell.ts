import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { VerlaufsEintrag } from '../services/verlauf-berechnung.ts';

export type VerlaufTextzeile = {
  readonly kennung: string;
  readonly datum: string;
  readonly fach: string;
  readonly punkte: string;
  readonly schnitt: string;
};

export type VerlaufTextmodell = {
  readonly zeilen: ReadonlyArray<VerlaufTextzeile>;
  readonly zusammenfassung: string;
};

const datumLang = (iso: string): string => {
  const [jahr, monat, tag] = iso.split('-');
  return `${tag}.${monat}.${jahr}`;
};

export const erstelleVerlaufTextmodell = (
  eintraege: ReadonlyArray<VerlaufsEintrag>,
): VerlaufTextmodell => {
  if (eintraege.length === 0) {
    return {
      zeilen: [],
      zusammenfassung: 'Noch keine Noten für die Verlaufslinie.',
    };
  }
  const [erste] = eintraege;
  const letzte = eintraege.at(-1) ?? erste;
  const punkte = eintraege.map((eintrag) => eintrag.punkte);
  let richtung = 'gleich geblieben';
  if (letzte.schnitt > erste.schnitt) {
    richtung = 'gestiegen';
  } else if (letzte.schnitt < erste.schnitt) {
    richtung = 'gesunken';
  }
  return {
    zeilen: eintraege.map((eintrag, index) => ({
      kennung: `${index}-${eintrag.datum}-${eintrag.fachKuerzel}`,
      datum: datumLang(eintrag.datum),
      fach: eintrag.fachKuerzel,
      punkte: formatNote(eintrag.punkte, 'punkte'),
      schnitt: formatNote(eintrag.schnitt, 'punkte'),
    })),
    zusammenfassung: `Der laufende Schnitt ist ${richtung}. Niedrigster Einzelwert: ${formatNote(Math.min(...punkte), 'punkte')}; höchster Einzelwert: ${formatNote(Math.max(...punkte), 'punkte')}; aktueller Schnitt: ${formatNote(letzte.schnitt, 'punkte')}.`,
  };
};
