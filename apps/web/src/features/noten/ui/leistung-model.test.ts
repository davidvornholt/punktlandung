import { describe, expect, it } from 'bun:test';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
import type { Leistung } from '../services/noten-service.ts';
import {
  deleteQuestion,
  dimensionText,
  fachShares,
  isNotFound,
  leadOf,
  shareHeading,
  shareLabel,
  shareParts,
  shareSentence,
  standingOf,
  standingSentence,
  tabNameOf,
  titleOf,
} from './leistung-model.ts';

const today = '2026-11-26';

const base = {
  gewicht: 1,
  notiz: null,
  fachId: 'physik',
  fachName: 'Physik',
  fachKuerzel: 'Ph',
  gewichtung: standardgewichtung,
} as const;

const graded = (
  id: string,
  kind: Leistung['kind'],
  wert: number,
  datum = '2026-10-01',
): Leistung => ({ ...base, id, kind, datum, status: 'graded', wert });

const planned = (
  id: string,
  kind: Leistung['kind'],
  datum: string,
): Leistung => ({ ...base, id, kind, datum, status: 'planned' });

const halfAndHalf: Fachgewichtung = {
  ...standardgewichtung,
  verhaeltnis: { schriftlich: 1, muendlich: 1 },
};

const sentenceFor = ({
  gewichtung = standardgewichtung,
  leistung,
  others,
  system = 'punkte',
}: {
  readonly gewichtung?: Fachgewichtung;
  readonly leistung: Leistung;
  readonly others: ReadonlyArray<Leistung>;
  readonly system?: Notensystem;
}) => {
  const standing = standingOf({
    gewichtung,
    leistung,
    leistungen: [...others, leistung],
    system,
    today,
  });
  return {
    standing,
    sentence: standingSentence({
      fachName: 'Physik',
      kind: leistung.kind,
      standing,
      system,
    }),
    dimension: dimensionText(standing, system),
  };
};

describe('standingSentence', () => {
  it('sagt in Notenpunkten, wie weit die Leistung unter dem Fachschnitt liegt und wohin sie ihn zieht', () => {
    // Three Noten in one list: 8, 11 and 14 average 11; without the 8 the Fach stands at 12,5.
    const result = sentenceFor({
      leistung: graded('k1', 'klausur', 8),
      others: [graded('k2', 'klausur', 11), graded('k3', 'klausur', 14)],
    });
    expect(result.sentence).toBe(
      'Die Klausur liegt 3 P. unter dem Fachschnitt und zieht ihn nach links: Ohne sie stünde Physik bei 12,5 P.',
    );
    expect(result.dimension).toBe('3 P. unter dem Fachschnitt');
  });

  it('sagt es für eine Leistung über dem Fachschnitt mit der anderen Richtung', () => {
    const result = sentenceFor({
      leistung: graded('t1', 'test', 14),
      others: [graded('k2', 'klausur', 11), graded('k3', 'klausur', 8)],
    });
    expect(result.sentence).toBe(
      'Der Test liegt 3 P. über dem Fachschnitt und zieht ihn nach rechts: Ohne ihn stünde Physik bei 9,5 P.',
    );
  });

  it('nennt im Sechsersystem die größere Zahl schlechter und zieht sie nach links', () => {
    // 4, 2 and 3 average 3; without the 4 the Fach stands at 2,5, which is better.
    const result = sentenceFor({
      leistung: graded('k1', 'klausur', 4),
      others: [graded('k2', 'klausur', 2), graded('k3', 'klausur', 3)],
      system: 'sechser',
    });
    expect(result.sentence).toBe(
      'Die Klausur ist um 1 schlechter als der Fachschnitt und zieht ihn nach links: Ohne sie stünde Physik bei 2,5.',
    );
    expect(result.dimension).toBe('1 schlechter als der Fachschnitt');
  });

  it('nennt im Sechsersystem die kleinere Zahl besser und zieht sie nach rechts', () => {
    const result = sentenceFor({
      leistung: graded('g1', 'gfs', 1.5),
      others: [graded('k2', 'klausur', 2.5), graded('k3', 'klausur', 3.5)],
      system: 'sechser',
    });
    expect(result.sentence).toBe(
      'Die GFS ist um 1 besser als der Fachschnitt und zieht ihn nach rechts: Ohne sie stünde Physik bei 3.',
    );
  });

  it('sagt, wenn die Leistung genau auf dem Fachschnitt liegt', () => {
    const result = sentenceFor({
      leistung: graded('k1', 'klausur', 10),
      others: [graded('k2', 'klausur', 8), graded('k3', 'klausur', 12)],
    });
    expect(result.sentence).toBe(
      'Die Klausur liegt genau auf dem Fachschnitt und verschiebt ihn nicht.',
    );
    expect(result.dimension).toBeNull();
  });

  it('sagt, wenn die einzige Note des Fachs der Fachschnitt ist', () => {
    const result = sentenceFor({
      leistung: graded('k1', 'klausur', 10),
      others: [planned('k2', 'klausur', '2026-12-08')],
    });
    expect(result.standing).toEqual({ kind: 'alone' });
    expect(result.sentence).toBe(
      'Die Klausur ist bisher die einzige Note in Physik und bestimmt den Fachschnitt allein.',
    );
    expect(result.dimension).toBeNull();
  });

  it('sagt für eine Leistung ohne Note, dass sie noch nicht zählt', () => {
    const waiting = sentenceFor({
      leistung: planned('k1', 'klausur', '2026-12-08'),
      others: [graded('k2', 'klausur', 11)],
    });
    expect(waiting.standing).toEqual({ kind: 'waiting', state: 'pending' });
    expect(waiting.sentence).toBe(
      'Die Klausur ist noch nicht gelandet. Sie wartet am rechten Rand der Skala und zählt erst, wenn die Note da ist.',
    );
    const missing = sentenceFor({
      leistung: planned('t1', 'test', '2026-11-12'),
      others: [graded('k2', 'klausur', 11)],
    });
    expect(missing.standing).toEqual({ kind: 'waiting', state: 'missing' });
    expect(missing.sentence).toBe(
      'Der Test ist vorbei, aber die Note fehlt noch. Bis sie eingetragen ist, zählt er nicht.',
    );
    expect(missing.dimension).toBeNull();
  });
});

describe('standingSentence mit einem Verhältnis der Wertungsbereiche', () => {
  /*
   * With a Verhältnis the Bereiche are weighed against each other. Schriftlich
   * 2 and 6 average 4, mündlich 14: the Fach stands at 9. The 6 lies under
   * that, and still the Fach would stand lower without it, at 8, because the
   * 2 would then be the whole of schriftlich.
   */
  it('sagt, wenn eine Leistung unter dem Fachschnitt ihn trotzdem hebt', () => {
    const result = sentenceFor({
      gewichtung: halfAndHalf,
      leistung: graded('k2', 'klausur', 6),
      others: [graded('k1', 'klausur', 2), graded('m1', 'muendlich', 14)],
    });
    expect(result.sentence).toBe(
      'Die Klausur liegt 3 P. unter dem Fachschnitt und zieht ihn trotzdem nach rechts: Ohne sie stünde Physik bei 8 P.',
    );
  });

  it('sagt, wenn eine Leistung auf dem Fachschnitt ihn trotzdem verschiebt', () => {
    // Schriftlich 6 and 10 average 8, mündlich 12: the Fach stands at 10, where the Klausur lies. Without it schriftlich is 6 and the Fach stands at 9.
    const result = sentenceFor({
      gewichtung: halfAndHalf,
      leistung: graded('k2', 'klausur', 10),
      others: [graded('k1', 'klausur', 6), graded('m1', 'muendlich', 12)],
    });
    expect(result.sentence).toBe(
      'Die Klausur liegt genau auf dem Fachschnitt. Ohne sie stünde Physik bei 9 P.',
    );
    expect(result.dimension).toBeNull();
  });

  it('sagt, wenn eine Leistung den gerundeten Fachschnitt nicht bewegt', () => {
    const many = Array.from({ length: 300 }, (_, index) =>
      graded(`k${index}`, 'klausur', 10),
    );
    const result = sentenceFor({
      leistung: graded('own', 'klausur', 11),
      others: many,
    });
    expect(result.sentence).toBe(
      'Die Klausur liegt 1 P. über dem Fachschnitt, verschiebt ihn aber kaum.',
    );
  });
});

describe('fachShares, shareSentence, shareParts', () => {
  const k1 = graded('k1', 'klausur', 11, '2026-09-28');
  const t1 = graded('t1', 'test', 8, '2026-11-05');
  const k2 = planned('k2', 'klausur', '2026-12-08');
  const leistungen = [k2, t1, k1];
  const shares = fachShares({ gewichtung: standardgewichtung, leistungen });

  it('rechnet heute unter den vorhandenen Noten und später unter allen', () => {
    expect(shares.now.get('k1')).toBeCloseTo(0.5, 10);
    expect(shares.now.get('k2')).toBeUndefined();
    expect(shares.later.get('k1')).toBeCloseTo(1 / 3, 10);
    expect(shares.later.get('k2')).toBeCloseTo(1 / 3, 10);
  });

  it('sagt, was eine Note heute zählt und was später', () => {
    expect(shareSentence({ leistung: k1, leistungen, shares })).toBe(
      'Die Klausur zählt heute 50 % des Fachschnitts. Sind auch die ausstehenden Leistungen benotet, sind es 33 %.',
    );
    const settled = [t1, k1];
    expect(
      shareSentence({
        leistung: t1,
        leistungen: settled,
        shares: fachShares({
          gewichtung: standardgewichtung,
          leistungen: settled,
        }),
      }),
    ).toBe('Der Test zählt heute 50 % des Fachschnitts.');
  });

  it('sagt für eine Leistung ohne Note, was sie benotet zählen wird', () => {
    expect(shareSentence({ leistung: k2, leistungen, shares })).toBe(
      'Benotet zählt sie 33 % des Fachschnitts.',
    );
  });

  it('nennt ein Gewicht, das nicht einfach ist', () => {
    const heavy = { ...k1, gewicht: 2 };
    const all = [t1, heavy];
    expect(
      shareSentence({
        leistung: heavy,
        leistungen: all,
        shares: fachShares({ gewichtung: standardgewichtung, leistungen: all }),
      }),
    ).toBe(
      'Die Klausur zählt heute 67 % des Fachschnitts. Sie ist 2-fach gewichtet.',
    );
  });

  it('teilt den Fachschnitt einer Note in die Anteile von heute, nach Datum', () => {
    const parts = shareParts({ leistung: t1, leistungen, shares });
    expect(parts.map((part) => part.id)).toEqual(['k1', 't1']);
    expect(parts.map((part) => part.mine)).toEqual([false, true]);
    expect(parts.every((part) => !part.open)).toBe(true);
    expect(parts.reduce((sum, part) => sum + part.share, 0)).toBeCloseTo(1, 10);
    expect(parts[0]?.tip).toBe('Klausur · 28.09. · 50 %');
  });

  it('teilt ihn für eine Leistung ohne Note in die Anteile von später', () => {
    const parts = shareParts({ leistung: k2, leistungen, shares });
    expect(parts.map((part) => part.id)).toEqual(['k1', 't1', 'k2']);
    expect(parts.map((part) => part.open)).toEqual([false, false, true]);
    expect(parts.reduce((sum, part) => sum + part.share, 0)).toBeCloseTo(1, 10);
  });
});

describe('Kopf der Seite', () => {
  it('nennt die Art und die Notiz getrennt', () => {
    expect(titleOf({ ...graded('k1', 'klausur', 9), notiz: 'Optik' })).toEqual({
      art: 'Klausur',
      notiz: 'Optik',
    });
    expect(titleOf(graded('m1', 'muendlich', 9))).toEqual({
      art: 'Mündlich',
      notiz: null,
    });
  });

  it('nennt Fach, Halbjahr, Datum und wie lange es her ist', () => {
    expect(
      leadOf({
        halbjahrLabel: 'J1.1',
        leistung: graded('k1', 'klausur', 9, '2026-11-16'),
        today,
      }),
    ).toBe('Physik · J1.1 · Montag, 16. November 2026 · vor 10 Tagen');
  });

  it('fragt vor dem Löschen nach der Leistung mit ihrem Datum', () => {
    expect(deleteQuestion(graded('k1', 'klausur', 9, '2026-11-16'))).toBe(
      'Klausur vom 16.11. löschen?',
    );
  });

  it('überschreibt den Anteil mit dem passenden Fürwort', () => {
    expect(shareHeading('klausur')).toBe('So viel zählt sie');
    expect(shareHeading('test')).toBe('So viel zählt er');
  });

  it('benennt das eigene Stück des Anteilsbalkens', () => {
    expect(shareLabel('klausur')).toBe('Diese Klausur');
    expect(shareLabel('test')).toBe('Dieser Test');
    expect(shareLabel('muendlich')).toBe('Diese mündliche Note');
  });

  it('benennt den Tab nach Art, Datum und Fach', () => {
    expect(tabNameOf(graded('k1', 'klausur', 9, '2026-11-16'))).toBe(
      'Klausur · 16.11. · Physik',
    );
  });

  it('erkennt die Antwort, dass es die Leistung nicht gibt', () => {
    expect(isNotFound({ _tag: 'NoteNichtGefunden', message: 'x' })).toBe(true);
    expect(isNotFound(new Error('Verbindung unterbrochen'))).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });
});
