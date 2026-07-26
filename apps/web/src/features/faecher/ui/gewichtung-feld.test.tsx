import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import {
  leistungsartLabel,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type { Leistungsart } from '#/shared/noten/notenwert.ts';
import { GewichtungFeld } from './gewichtung-feld.tsx';
import type { GewichtungState } from './gewichtung-modell.ts';
import { gewichtungStateFrom } from './gewichtung-modell.ts';
import { VerhaeltnisWahl } from './verhaeltnis-wahl.tsx';

const noop = () => undefined;
const testRadioGroupPattern =
  /<fieldset[^>]*><legend[^>]*>Sammlung für Test<\/legend>[\s\S]*name="sammlung-test"[\s\S]*name="sammlung-test"[\s\S]*<\/fieldset>/u;
const describedByPattern = /aria-describedby="(?<errorId>[^"]+)"/u;

const entkoppelterZustand: GewichtungState = {
  gewichtung: {
    ...standardgewichtung,
    arten: {
      ...standardgewichtung.arten,
      test: { ...standardgewichtung.arten.test, sammlung: 'einzeln' },
    },
  },
  gfsFolgtKlausur: false,
  testsFolgenKlausur: false,
  sonstigeFolgtMuendlich: false,
};

const inputMitName = (markup: string, name: string): string => {
  const nameIndex = markup.indexOf(`name="${name}"`);
  const inputStart = markup.lastIndexOf('<input', nameIndex);
  const inputEnd = markup.indexOf('>', nameIndex);
  return markup.slice(inputStart, inputEnd + 1);
};

const gewichtsname = (kind: Leistungsart): string =>
  `aria-label="Gewicht für ${leistungsartLabel[kind]}"`;

describe('GewichtungFeld', () => {
  it('benennt jede Leistungsart-Zeile als eigene Gruppe', () => {
    const markup = renderToStaticMarkup(
      <GewichtungFeld
        onAktion={noop}
        system="sechser"
        zustand={entkoppelterZustand}
      />,
    );

    for (const kind of leistungsartReihenfolge) {
      expect(markup).toInclude(
        `<legend class="sr-only">${leistungsartLabel[kind]}</legend>`,
      );
    }
  });

  it('gibt allen entkoppelten Gewichten eindeutige Namen', () => {
    const markup = renderToStaticMarkup(
      <GewichtungFeld
        onAktion={noop}
        system="sechser"
        zustand={entkoppelterZustand}
      />,
    );

    for (const kind of leistungsartReihenfolge) {
      expect(inputMitName(markup, `gewicht-${kind}`)).toInclude(
        gewichtsname(kind),
      );
    }
  });

  it('behält eindeutige Namen in einem gekoppelten Zustand', () => {
    const markup = renderToStaticMarkup(
      <GewichtungFeld
        onAktion={noop}
        system="sechser"
        zustand={gewichtungStateFrom(standardgewichtung)}
      />,
    );

    expect(inputMitName(markup, 'gewicht-klausur')).toInclude(
      gewichtsname('klausur'),
    );
    expect(inputMitName(markup, 'gewicht-muendlich')).toInclude(
      gewichtsname('muendlich'),
    );
    expect(markup).not.toInclude('name="gewicht-gfs"');
    expect(markup).not.toInclude('name="gewicht-test"');
    expect(markup).not.toInclude('name="gewicht-sonstige"');
  });

  it('benennt die Test-Sammelwahl als Radio-Gruppe', () => {
    const markup = renderToStaticMarkup(
      <GewichtungFeld
        onAktion={noop}
        system="sechser"
        zustand={entkoppelterZustand}
      />,
    );

    expect(markup).toMatch(testRadioGroupPattern);
  });
});

describe('VerhaeltnisWahl', () => {
  it('verknüpft den 0:0-Fehler mit beiden ungültigen Anteilen', () => {
    const markup = renderToStaticMarkup(
      <VerhaeltnisWahl
        onAktion={noop}
        verhaeltnis={{ schriftlich: 0, muendlich: 0 }}
      />,
    );
    const schriftlich = inputMitName(markup, 'anteil-schriftlich');
    const muendlich = inputMitName(markup, 'anteil-muendlich');
    const errorId = describedByPattern.exec(schriftlich)?.groups?.errorId;

    expect(errorId).toBeDefined();
    expect(schriftlich).toInclude('aria-invalid="true"');
    expect(muendlich).toInclude('aria-invalid="true"');
    expect(muendlich).toInclude(`aria-describedby="${errorId}"`);
    expect(markup).toInclude(
      `id="${errorId}" role="alert">Mindestens ein Bereich muss zählen.`,
    );
  });

  it('beschreibt gültige Anteile nicht als fehlerhaft', () => {
    const markup = renderToStaticMarkup(
      <VerhaeltnisWahl
        onAktion={noop}
        verhaeltnis={{ schriftlich: 3, muendlich: 1 }}
      />,
    );

    expect(inputMitName(markup, 'anteil-schriftlich')).toInclude(
      'aria-invalid="false"',
    );
    expect(inputMitName(markup, 'anteil-muendlich')).toInclude(
      'aria-invalid="false"',
    );
    expect(markup).not.toInclude('aria-describedby=');
    expect(markup).not.toInclude('role="alert"');
  });
});
