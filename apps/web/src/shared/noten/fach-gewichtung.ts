import { Data, Effect, Schema } from 'effect';

import type { Artgewichtung, Fachgewichtung } from './notenwert.ts';

/** Eingabegrenzen — auch die Formulare nutzen sie für ihre Attribute. */
export const gewichtungsGrenzen = {
  gewichtMax: 10,
  gewichtSchritt: 0.25,
  anteilMax: 100,
} as const;

const Gewicht = Schema.Number.pipe(
  Schema.positive(),
  Schema.lessThanOrEqualTo(gewichtungsGrenzen.gewichtMax),
);

const Anteil = Schema.Number.pipe(
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(gewichtungsGrenzen.anteilMax),
);

const ArtgewichtungSchema = Schema.Struct({
  gewicht: Gewicht,
  sammlung: Schema.Literal('einzeln', 'gesammelt'),
});

const EinzelgewichtungSchema = ArtgewichtungSchema.pipe(
  Schema.filter(
    (art) =>
      art.sammlung === 'einzeln' ||
      'Nur Tests dürfen als Sammlung gewichtet werden.',
  ),
);

const BereichsverhaeltnisSchema = Schema.Struct({
  schriftlich: Anteil,
  muendlich: Anteil,
}).pipe(
  Schema.filter(
    (verhaeltnis) =>
      verhaeltnis.schriftlich + verhaeltnis.muendlich > 0 ||
      'Mindestens ein Bereich muss zählen.',
  ),
);

/**
 * Die verkündete Gewichtung eines Fachs. Sie liegt als eine jsonb-Spalte in
 * der Datenbank, damit Fachstand-Historisierung und Formular genau eine Form
 * kopieren müssen statt einer Spalte je Leistungsart.
 */
export const FachgewichtungSchema = Schema.Struct({
  verhaeltnis: Schema.NullOr(BereichsverhaeltnisSchema),
  arten: Schema.Struct({
    klausur: EinzelgewichtungSchema,
    gfs: EinzelgewichtungSchema,
    test: ArtgewichtungSchema,
    muendlich: EinzelgewichtungSchema,
    sonstige: EinzelgewichtungSchema,
  }),
});

export class GewichtungUngueltig extends Data.TaggedError(
  'GewichtungUngueltig',
)<{
  readonly fachId: string;
}> {
  override get message(): string {
    return `Die Gewichtung des Fachs ${this.fachId} ist ungültig. Öffne das Fach und speichere die Gewichtung neu.`;
  }
}

/**
 * Dekodiert die jsonb-Spalte. Der Rückgabetyp bindet Schema und
 * Notenmathematik aneinander: driften sie auseinander, bricht der Typcheck.
 */
export const dekodiereGewichtung = (
  roh: unknown,
  fachId: string,
): Effect.Effect<Fachgewichtung, GewichtungUngueltig> =>
  Schema.decodeUnknown(FachgewichtungSchema)(roh).pipe(
    Effect.mapError(() => new GewichtungUngueltig({ fachId })),
  );

/**
 * Startpunkt eines neuen Fachs: eine gemeinsame Liste, in der jede Note
 * gleich zählt — die einzige Annahme ist die verbreitete Testregel. Ein
 * vorbelegtes Bereichsverhältnis wäre eine Verkündung, die niemand gemacht
 * hat, und würde jeden Schnitt still verzerren.
 */
export const standardgewichtung: Fachgewichtung = {
  verhaeltnis: null,
  arten: {
    klausur: { gewicht: 1, sammlung: 'einzeln' },
    gfs: { gewicht: 1, sammlung: 'einzeln' },
    test: { gewicht: 1, sammlung: 'gesammelt' },
    muendlich: { gewicht: 1, sammlung: 'einzeln' },
    sonstige: { gewicht: 1, sammlung: 'einzeln' },
  },
};

/** Vorbelegung, sobald das Verhältnis eingeschaltet wird. */
export const standardverhaeltnis = { schriftlich: 1, muendlich: 1 } as const;

const gleicheArt = (eine: Artgewichtung, andere: Artgewichtung): boolean =>
  eine.gewicht === andere.gewicht && eine.sammlung === andere.sammlung;

/** "Eine GFS zählt wie eine Klausur" — die Regel der meisten Lehrkräfte. */
export const gfsZaehltWieKlausur = (gewichtung: Fachgewichtung): boolean =>
  gleicheArt(gewichtung.arten.gfs, gewichtung.arten.klausur);

/** "Sonstiges zählt wie eine mündliche Note." */
export const sonstigeZaehltWieMuendlich = (
  gewichtung: Fachgewichtung,
): boolean => gleicheArt(gewichtung.arten.sonstige, gewichtung.arten.muendlich);

/** "Alle Tests zusammen zählen wie eine Klausur." */
export const testsZaehlenWieEineKlausur = (
  gewichtung: Fachgewichtung,
): boolean => {
  const { test, klausur } = gewichtung.arten;
  return (
    test.sammlung === 'gesammelt' &&
    klausur.sammlung === 'einzeln' &&
    test.gewicht === klausur.gewicht
  );
};
