import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from './fach-gewichtung.ts';
import { gewichtungsZeile, verhaeltnisProzent } from './gewichtung-text.ts';

describe('verhaeltnisProzent', () => {
  it('normalisiert jede Schreibweise derselben Verkündung', () => {
    expect(verhaeltnisProzent({ schriftlich: 3, muendlich: 1 })).toEqual({
      schriftlich: 75,
      muendlich: 25,
    });
    expect(verhaeltnisProzent({ schriftlich: 60, muendlich: 40 })).toEqual({
      schriftlich: 60,
      muendlich: 40,
    });
  });

  it('ergänzt sich auch bei krummen Verhältnissen auf 100', () => {
    const prozent = verhaeltnisProzent({ schriftlich: 2, muendlich: 1 });
    expect(prozent.schriftlich + prozent.muendlich).toBe(100);
  });
});

describe('gewichtungsZeile', () => {
  it('nennt die Standardregeln, die die Lehrkraft verkündet hat', () => {
    expect(gewichtungsZeile(standardgewichtung)).toBe(
      'Eine gemeinsame Liste · eine GFS zählt wie eine Klausur · alle Tests zusammen zählen wie eine Klausur · Sonstiges zählt wie eine mündliche Note',
    );
  });

  it('führt die Aufteilung als ganze Prozente an', () => {
    const zeile = gewichtungsZeile({
      ...standardgewichtung,
      verhaeltnis: { schriftlich: 3, muendlich: 1 },
    });
    expect(zeile).toStartWith('Schriftlich 75 % : mündlich 25 %');
  });

  it('beschreibt abweichende Gewichte statt sie zu verschweigen', () => {
    const zeile = gewichtungsZeile({
      ...standardgewichtung,
      arten: {
        ...standardgewichtung.arten,
        klausur: { gewicht: 2, sammlung: 'einzeln' },
      },
    });
    expect(zeile).toContain('Klausuren zählen doppelt');
    // Die GFS folgt der Klausur nicht mehr und sagt das auch.
    expect(zeile).not.toContain('eine GFS zählt wie eine Klausur');
  });
});
