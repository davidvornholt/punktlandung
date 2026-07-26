import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import {
  leistungsartLabel,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type { Leistungsart } from '#/shared/noten/notenwert.ts';
import { GewichtungField } from './gewichtung-field.tsx';
import type { GewichtungState } from './gewichtung-model.ts';
import { gewichtungStateFrom } from './gewichtung-model.ts';
import { VerhaeltnisChoice } from './verhaeltnis-choice.tsx';

const noop = () => undefined;
const testRadioGroupPattern =
  /<fieldset[^>]*><legend[^>]*>Sammlung für Test<\/legend>[\s\S]*name="sammlung-test"[\s\S]*name="sammlung-test"[\s\S]*<\/fieldset>/u;
const describedByPattern = /aria-describedby="(?<errorId>[^"]+)"/u;

const uncoupledState: GewichtungState = {
  gewichtung: {
    ...standardgewichtung,
    arten: {
      ...standardgewichtung.arten,
      test: { ...standardgewichtung.arten.test, sammlung: 'einzeln' },
    },
  },
  gfsFollowsKlausur: false,
  testsFollowKlausur: false,
  sonstigeFollowsMuendlich: false,
};

const inputWithName = (markup: string, name: string): string => {
  const nameIndex = markup.indexOf(`name="${name}"`);
  const inputStart = markup.lastIndexOf('<input', nameIndex);
  const inputEnd = markup.indexOf('>', nameIndex);
  return markup.slice(inputStart, inputEnd + 1);
};

const gewichtungName = (kind: Leistungsart): string =>
  `aria-label="Gewicht für ${leistungsartLabel[kind]}"`;

describe('GewichtungField', () => {
  it('benennt jede Leistungsart-Zeile als eigene Gruppe', () => {
    const markup = renderToStaticMarkup(
      <GewichtungField
        onAction={noop}
        state={uncoupledState}
        system="sechser"
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
      <GewichtungField
        onAction={noop}
        state={uncoupledState}
        system="sechser"
      />,
    );

    for (const kind of leistungsartReihenfolge) {
      expect(inputWithName(markup, `gewicht-${kind}`)).toInclude(
        gewichtungName(kind),
      );
    }
  });

  it('behält eindeutige Namen in einem gekoppelten Zustand', () => {
    const markup = renderToStaticMarkup(
      <GewichtungField
        onAction={noop}
        state={gewichtungStateFrom(standardgewichtung)}
        system="sechser"
      />,
    );

    expect(inputWithName(markup, 'gewicht-klausur')).toInclude(
      gewichtungName('klausur'),
    );
    expect(inputWithName(markup, 'gewicht-muendlich')).toInclude(
      gewichtungName('muendlich'),
    );
    expect(markup).not.toInclude('name="gewicht-gfs"');
    expect(markup).not.toInclude('name="gewicht-test"');
    expect(markup).not.toInclude('name="gewicht-sonstige"');
  });

  it('benennt die Test-Sammelwahl als Radio-Gruppe', () => {
    const markup = renderToStaticMarkup(
      <GewichtungField
        onAction={noop}
        state={uncoupledState}
        system="sechser"
      />,
    );

    expect(markup).toMatch(testRadioGroupPattern);
  });
});

describe('VerhaeltnisChoice', () => {
  it('verknüpft den 0:0-Fehler mit beiden ungültigen Anteilen', () => {
    const markup = renderToStaticMarkup(
      <VerhaeltnisChoice
        onAction={noop}
        verhaeltnis={{ schriftlich: 0, muendlich: 0 }}
      />,
    );
    const schriftlich = inputWithName(markup, 'anteil-schriftlich');
    const muendlich = inputWithName(markup, 'anteil-muendlich');
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
      <VerhaeltnisChoice
        onAction={noop}
        verhaeltnis={{ schriftlich: 3, muendlich: 1 }}
      />,
    );

    expect(inputWithName(markup, 'anteil-schriftlich')).toInclude(
      'aria-invalid="false"',
    );
    expect(inputWithName(markup, 'anteil-muendlich')).toInclude(
      'aria-invalid="false"',
    );
    expect(markup).not.toInclude('aria-describedby=');
    expect(markup).not.toInclude('role="alert"');
  });
});
