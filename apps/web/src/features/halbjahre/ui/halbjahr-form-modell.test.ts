import { describe, expect, it } from 'bun:test';

import type { Halbjahr } from '../services/halbjahr-service.ts';
import {
  belegteHalbjahre,
  halbjahrFormWerte,
  istBelegt,
  mitAktualisiertemZeitraum,
  neuesHalbjahrVorschlag,
  zuHalbjahrEingabe,
} from './halbjahr-form-modell.ts';

const zehnEins: Halbjahr = {
  id: 'A',
  klassenstufe: '10',
  schoolYear: '2025/26',
  half: 1,
  system: 'sechser',
  startsOn: '2025-08-01',
  endsOn: '2026-01-31',
};
const zehnZwei: Halbjahr = {
  id: 'B',
  klassenstufe: '10',
  schoolYear: '2025/26',
  half: 2,
  system: 'sechser',
  startsOn: '2026-02-01',
  endsOn: '2026-07-31',
};

describe('neuesHalbjahrVorschlag', () => {
  it('schlägt ohne Bestand das heute laufende Halbjahr vor', () => {
    const vorschlag = neuesHalbjahrVorschlag([], '2026-09-15');

    expect(vorschlag.schoolYear).toBe('2026/27');
    expect(vorschlag.half).toBe(1);
    expect(vorschlag.startsOn).toBe('2026-08-01');
    expect(vorschlag.endsOn).toBe('2027-01-31');
  });

  it('folgt auf ein erstes Halbjahr im selben Schuljahr das zweite', () => {
    const vorschlag = neuesHalbjahrVorschlag([zehnEins], '2025-10-01');

    expect(vorschlag).toMatchObject({
      klassenstufe: '10',
      schoolYear: '2025/26',
      half: 2,
      startsOn: '2026-02-01',
      endsOn: '2026-07-31',
    });
  });

  it('rückt nach einem zweiten Halbjahr in Schuljahr und Klassenstufe vor', () => {
    const vorschlag = neuesHalbjahrVorschlag(
      [zehnEins, zehnZwei],
      '2026-07-25',
    );

    expect(vorschlag).toMatchObject({
      klassenstufe: 'J1',
      schoolYear: '2026/27',
      half: 1,
      startsOn: '2026-08-01',
      endsOn: '2027-01-31',
    });
  });

  it('richtet sich nach dem zuletzt begonnenen, nicht dem ersten Eintrag', () => {
    expect(neuesHalbjahrVorschlag([zehnZwei, zehnEins], '2026-07-25')).toEqual(
      neuesHalbjahrVorschlag([zehnEins, zehnZwei], '2026-07-25'),
    );
  });

  it('bleibt nach J2 auf J2 stehen', () => {
    const j2: Halbjahr = {
      ...zehnZwei,
      id: 'C',
      klassenstufe: 'J2',
      schoolYear: '2027/28',
      system: 'punkte',
      startsOn: '2028-02-01',
      endsOn: '2028-07-31',
    };

    expect(neuesHalbjahrVorschlag([j2], '2028-08-01').klassenstufe).toBe('J2');
  });
});

describe('halbjahrFormWerte', () => {
  it('übernimmt beim Bearbeiten den gespeicherten Stand', () => {
    const werte = halbjahrFormWerte(zehnEins, [zehnEins], '2026-07-25');

    expect(werte).toEqual({
      klassenstufe: '10',
      schoolYear: '2025/26',
      half: 1,
      startsOn: '2025-08-01',
      endsOn: '2026-01-31',
      zeitraumAngepasst: false,
    });
  });

  it('erkennt einen vom amtlichen Zeitraum abweichenden Bestand', () => {
    const werte = halbjahrFormWerte(
      { ...zehnEins, startsOn: '2025-09-11' },
      [zehnEins],
      '2026-07-25',
    );

    expect(werte.zeitraumAngepasst).toBe(true);
    expect(werte.startsOn).toBe('2025-09-11');
  });
});

describe('mitAktualisiertemZeitraum', () => {
  it('zieht den Zeitraum bei einem Halbjahreswechsel nach', () => {
    const werte = mitAktualisiertemZeitraum({
      ...halbjahrFormWerte(zehnEins, [], '2026-07-25'),
      half: 2,
    });

    expect(werte.startsOn).toBe('2026-02-01');
    expect(werte.endsOn).toBe('2026-07-31');
  });

  it('lässt einen angepassten Zeitraum unangetastet', () => {
    const werte = mitAktualisiertemZeitraum({
      klassenstufe: '10',
      schoolYear: '2025/26',
      half: 2,
      startsOn: '2026-02-15',
      endsOn: '2026-06-30',
      zeitraumAngepasst: true,
    });

    expect(werte.startsOn).toBe('2026-02-15');
    expect(werte.endsOn).toBe('2026-06-30');
  });
});

describe('zuHalbjahrEingabe', () => {
  it('sendet nur die erfassten Felder; das Notensystem leitet der Server ab', () => {
    const werte = halbjahrFormWerte(zehnEins, [], '2026-07-25');

    expect(zuHalbjahrEingabe({ ...werte, klassenstufe: 'J1' })).toEqual({
      klassenstufe: 'J1',
      schoolYear: '2025/26',
      half: 1,
      startsOn: '2025-08-01',
      endsOn: '2026-01-31',
    });
  });
});

describe('belegteHalbjahre', () => {
  it('meldet vergebene Kombinationen aus Schuljahr und Halbjahr', () => {
    const belegt = belegteHalbjahre([zehnEins, zehnZwei], null);

    expect(istBelegt(belegt, '2025/26', 1)).toBe(true);
    expect(istBelegt(belegt, '2026/27', 1)).toBe(false);
  });

  it('nimmt das gerade bearbeitete Halbjahr aus', () => {
    const belegt = belegteHalbjahre([zehnEins, zehnZwei], zehnEins);

    expect(istBelegt(belegt, '2025/26', 1)).toBe(false);
    expect(istBelegt(belegt, '2025/26', 2)).toBe(true);
  });
});
