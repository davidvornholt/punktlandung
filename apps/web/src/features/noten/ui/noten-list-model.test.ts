import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import type { Leistung } from '../services/noten-service.ts';
import { fachRuler } from './fach-ruler.ts';
import type { EntryDraft } from './note-entry-model.ts';
import {
  asksForNew,
  closeIfSaved,
  createErrorText,
  deletedText,
  fachGroups,
  fachStays,
  fromSearch,
  isOpenFor,
  metaText,
  noUpdateErrors,
  type OpenEntry,
  openKey,
  savedText,
  updateErrorText,
  withNote,
  withoutNote,
  withoutWaiting,
} from './noten-list-model.ts';

const today = '2026-11-26';

const base = (id: string, fachId: string) => ({
  datum: '2026-10-05',
  fachId,
  fachKuerzel: fachId.slice(0, 1).toUpperCase(),
  fachName: `${fachId.slice(0, 1).toUpperCase()}${fachId.slice(1)}`,
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur' as const,
  notiz: null,
});

const note = (id: string, fachId: string, wert = 10): Leistung => ({
  ...base(id, fachId),
  status: 'graded',
  wert,
});

const planned = (id: string, fachId: string): Leistung => ({
  ...base(id, fachId),
  datum: '2026-12-10',
  status: 'planned',
});

const fach = (id: string, name: string) => ({
  id,
  name,
  shortName: name.slice(0, 2),
  gewichtung: standardgewichtung,
});

const latein = fach('latein', 'Latein');
const mathe = fach('mathe', 'Mathe');

const noteA = note('note-a', 'latein');
const noteB = note('note-b', 'latein');

const failure = {
  _tag: 'HalbjahrGesperrt',
  message: 'Das Halbjahr ist gesperrt.',
};
const other = new Error('Verbindung weg');

const typed: EntryDraft = {
  kind: 'test',
  wert: 7,
  gewicht: 1,
  datum: today,
  notiz: 'Vokabeln',
};

const entry = (
  leistung: Leistung | null,
  fachId: string,
  rest: { readonly savingId?: string } = {},
): OpenEntry => ({ kind: 'entry', leistung, fachId, ...rest });

const choice: OpenEntry = { kind: 'choose', carry: null };
const moving: OpenEntry = {
  kind: 'choose',
  carry: { leistung: noteA, draft: typed, fachId: 'latein' },
};
const movingNew: OpenEntry = {
  kind: 'choose',
  carry: { leistung: null, draft: typed, fachId: 'latein' },
};

const selectable = (fachId: string) =>
  fachId === 'latein' || fachId === 'mathe';

describe('Fehler je Note', () => {
  /**
   * Die Liste teilt sich eine Änderungsmutation über alle Zeilen, und die trägt
   * nur ihren letzten Ausgang. Ohne die Kennung verschluckte das Speichern
   * einer zweiten Note den Fehler der ersten, und diese bliebe stillschweigend
   * ungeändert.
   */
  it('behält den Fehler einer Note, wenn eine zweite scheitert', () => {
    const known = withNote(noUpdateErrors, 'note-a', failure);

    const next = withNote(known, 'note-b', other);

    expect(next.get('note-a')).toBe(failure);
    expect(next.get('note-b')).toBe(other);
  });

  it('nimmt nur den Fehler der genannten Note zurück', () => {
    const known = withNote(
      withNote(noUpdateErrors, 'note-a', failure),
      'note-b',
      other,
    );

    const next = withoutNote(known, 'note-a');

    expect(next.has('note-a')).toBe(false);
    expect(next.get('note-b')).toBe(other);
  });

  it('lässt den bekannten Stand unverändert', () => {
    const known = withNote(noUpdateErrors, 'note-a', failure);

    withoutNote(known, 'note-a');
    withNote(known, 'note-b', other);

    expect([...known.keys()]).toEqual(['note-a']);
  });

  it('benennt einen Fehler und schweigt ohne einen', () => {
    expect(updateErrorText(failure)).toBe('Das Halbjahr ist gesperrt.');
    expect(updateErrorText(undefined)).toBe(null);
    expect(updateErrorText(other)).toContain('konnte nicht geändert werden');
  });

  it('benennt den Fehler einer neuen Note', () => {
    expect(createErrorText(failure)).toBe('Das Halbjahr ist gesperrt.');
    expect(createErrorText(other)).toContain('Die Eingaben bleiben erhalten');
  });
});

describe('fachGroups', () => {
  it('führt jedes Fach des Schuljahrs in seiner Reihenfolge, auch ohne Note', () => {
    const groups = fachGroups([mathe, latein], [noteA, noteB]);

    expect(groups.map((group) => group.id)).toEqual(['mathe', 'latein']);
    expect(groups.map((group) => group.leistungen.length)).toEqual([0, 2]);
    expect(groups.map((group) => group.archived)).toEqual([false, false]);
    expect(groups[0]?.kuerzel).toBe('Ma');
  });

  /**
   * Ein archiviertes Fach steht nicht mehr in der Fächerliste, seine Noten
   * hängen aber weiter an ihm. Es bleibt deshalb auf der Seite, solange es
   * welche hat, mit dem Namen und der Gewichtung, die seine Noten tragen.
   */
  it('hängt archivierte Fächer mit ihren Noten hinten an', () => {
    const kunst = note('note-k', 'kunst');
    const chemie = note('note-c', 'chemie');

    const groups = fachGroups([latein], [kunst, noteA, chemie]);

    expect(groups.map((group) => group.id)).toEqual([
      'latein',
      'chemie',
      'kunst',
    ]);
    expect(groups.map((group) => group.archived)).toEqual([false, true, true]);
    expect(groups[2]).toMatchObject({
      name: 'Kunst',
      kuerzel: 'K',
      leistungen: [kunst],
    });
  });
});

describe('metaText', () => {
  const halbe: Fachgewichtung = {
    ...standardgewichtung,
    verhaeltnis: { schriftlich: 1, muendlich: 1 },
  };
  const meta = (
    leistungen: ReadonlyArray<Leistung>,
    gewichtung = standardgewichtung,
  ) =>
    metaText({
      evaluation: fachRuler({ gewichtung, leistungen, system: 'punkte', today })
        .evaluation,
      leistungen,
    });

  it('zählt Noten und Ausstehendes', () => {
    expect(meta([])).toBe('Noch keine Note');
    expect(meta([noteA])).toBe('1 Note');
    expect(meta([noteA, noteB, planned('p', 'latein')])).toBe(
      '2 Noten · 1 ausstehend',
    );
    expect(meta([planned('p', 'latein')])).toBe('1 ausstehend');
  });

  /** Ein Bereich allein ist der Fachschnitt, und der steht schon unter der Skala. */
  it('nennt die Bereiche nur, wenn beide eine Note haben', () => {
    const muendlich: Leistung = {
      ...note('m', 'latein', 7),
      kind: 'muendlich',
    };

    expect(meta([noteA, muendlich], halbe)).toBe(
      '2 Noten · schriftlich 10 · mündlich 7',
    );
    expect(meta([noteA], halbe)).toBe('1 Note');
  });
});

describe('was offen ist', () => {
  it('unterscheidet jeden offenen Zustand vom anderen', () => {
    const keys = [
      openKey(null),
      openKey(choice),
      openKey(entry(null, 'latein')),
      openKey(entry(null, 'mathe')),
      openKey(entry(noteA, 'latein')),
      openKey(entry(noteA, 'mathe')),
      openKey(entry(noteB, 'latein')),
    ];

    expect(keys[0]).toBe(null);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /** Die Adresse sagt mit `neu` nur, dass eine Note entsteht, die es noch nicht gibt. */
  it('erkennt, was einer neuen Note gilt', () => {
    expect(asksForNew(null)).toBe(false);
    expect(asksForNew(choice)).toBe(true);
    expect(asksForNew(movingNew)).toBe(true);
    expect(asksForNew(moving)).toBe(false);
    expect(asksForNew(entry(null, 'latein'))).toBe(true);
    expect(asksForNew(entry(noteA, 'latein'))).toBe(false);
  });
});

describe('fromSearch', () => {
  it('fragt nach dem Fach, wenn die Adresse keines nennt', () => {
    expect(fromSearch(null, { neu: true }, selectable)).toEqual(choice);
  });

  it('öffnet den Eintrag im genannten Fach', () => {
    expect(fromSearch(null, { neu: true, fach: 'mathe' }, selectable)).toEqual(
      entry(null, 'mathe'),
    );
  });

  /** In einem archivierten oder unbekannten Fach lässt sich nichts eintragen. */
  it('fragt nach dem Fach, wenn das genannte keines ist, in das sich eintragen lässt', () => {
    expect(fromSearch(null, { neu: true, fach: 'kunst' }, selectable)).toEqual(
      choice,
    );
  });

  /** Die Adresse ändert sich auch, während ein Eintrag offen ist; was getippt wurde, darf dabei nicht verloren gehen. */
  it('behält, was schon offen ist und zur Adresse passt', () => {
    const open = entry(null, 'mathe', { savingId: 'neu-1' });

    expect(fromSearch(open, { neu: true, fach: 'mathe' }, selectable)).toBe(
      open,
    );
    expect(fromSearch(choice, { neu: true }, selectable)).toBe(choice);
  });

  it('wechselt das Fach, wenn die Adresse ein anderes nennt', () => {
    expect(
      fromSearch(
        entry(null, 'mathe'),
        { neu: true, fach: 'latein' },
        selectable,
      ),
    ).toEqual(entry(null, 'latein'));
    expect(
      fromSearch(entry(noteA, 'latein'), { neu: true }, selectable),
    ).toEqual(choice);
  });

  /**
   * „Zurück“ nimmt `neu` aus der Adresse: der neue Eintrag schließt. Eine
   * Leistung, die gerade geändert wird, hat mit der Adresse nichts zu tun und
   * bleibt offen.
   */
  it('schließt mit der Adresse nur, was sie geöffnet hat', () => {
    const changing = entry(noteA, 'latein');

    expect(fromSearch(entry(null, 'mathe'), {}, selectable)).toBe(null);
    expect(fromSearch(choice, {}, selectable)).toBe(null);
    expect(fromSearch(changing, {}, selectable)).toBe(changing);
    expect(fromSearch(moving, { fach: 'mathe' }, selectable)).toBe(moving);
    expect(fromSearch(null, { fach: 'mathe' }, selectable)).toBe(null);
  });
});

describe('closeIfSaved', () => {
  it('schließt den Eintrag der gespeicherten Note', () => {
    expect(closeIfSaved('note-a')(entry(noteA, 'latein'))).toBe(null);
  });

  /** Eine neue Note hat noch keine Leistung; ihr Eintrag wartet auf die Kennung, unter der sie abgeschickt wurde. */
  it('schließt den Eintrag der neuen Note, die er abgeschickt hat', () => {
    const sent = entry(null, 'latein', { savingId: 'neu-1' });

    expect(isOpenFor(sent, 'neu-1')).toBe(true);
    expect(closeIfSaved('neu-1')(sent)).toBe(null);
    expect(closeIfSaved('neu-2')(sent)).toBe(sent);
  });

  /**
   * Bis die Änderung durch ist, kann der Benutzer längst eine andere Note
   * geöffnet haben; die dürfte ihm der Nachlauf der ersten nicht zuklappen.
   */
  it('lässt offen, was inzwischen anderes geöffnet wurde', () => {
    const otherNote = entry(noteB, 'latein');
    const fresh = entry(null, 'latein');

    expect(closeIfSaved('note-a')(otherNote)).toBe(otherNote);
    expect(closeIfSaved('note-a')(fresh)).toBe(fresh);
    expect(closeIfSaved('note-a')(moving)).toBe(moving);
    expect(closeIfSaved('note-a')(null)).toBe(null);
  });
});

describe('withoutWaiting', () => {
  const groups = fachGroups(
    [latein, mathe],
    [noteA, note('neu-1', 'latein'), note('note-m', 'mathe')],
  );

  /** Die Note liegt schon im Abruf, ihr Eintrag ist aber noch offen: erst wenn er schließt, landet sie auf der Skala. */
  it('hält die Note zurück, auf die ein neuer Eintrag wartet', () => {
    const shown = withoutWaiting(
      groups,
      entry(null, 'latein', { savingId: 'neu-1' }),
    );

    expect(shown[0]?.leistungen.map((leistung) => leistung.id)).toEqual([
      'note-a',
    ]);
    expect(shown[1]).toBe(groups[1]);
  });

  it('lässt die Seite sonst, wie sie ist', () => {
    expect(withoutWaiting(groups, null)).toBe(groups);
    expect(withoutWaiting(groups, entry(null, 'latein'))).toBe(groups);
    expect(withoutWaiting(groups, choice)).toBe(groups);
  });
});

describe('fachStays', () => {
  const [lateinGroup] = fachGroups([latein], []);
  const [, kunstGroup] = fachGroups([latein], [note('note-k', 'kunst')]);

  it('behält ein Fach des Schuljahrs auch ohne Note', () => {
    expect(fachStays(lateinGroup, [])).toBe(true);
  });

  /** Davon hängt ab, wohin der Fokus nach dem Löschen geht: an die Überschrift des Fachs oder an die Liste. */
  it('behält ein archiviertes Fach nur, solange es eine Leistung hat', () => {
    expect(fachStays(kunstGroup, [note('note-k2', 'kunst')])).toBe(true);
    expect(fachStays(kunstGroup, [noteA])).toBe(false);
    expect(fachStays(undefined, [noteA])).toBe(false);
  });
});

describe('Ansagen', () => {
  const values = { datum: today, kind: 'klausur', wert: 10 } as const;

  it('sagt, was eingetragen oder gespeichert wurde', () => {
    expect(
      savedText({
        fachName: 'Physik',
        system: 'punkte',
        values,
        verb: 'Eingetragen',
      }),
    ).toBe('Eingetragen: Physik, Klausur vom 26.11.2026, 10 P.');
    expect(
      savedText({
        fachName: 'Latein',
        system: 'sechser',
        values: { ...values, wert: 2.5 },
        verb: 'Gespeichert',
      }),
    ).toBe('Gespeichert: Latein, Klausur vom 26.11.2026, 2,5.');
  });

  it('sagt es auch von einer Leistung ohne Note', () => {
    expect(
      savedText({
        fachName: 'Physik',
        system: 'punkte',
        values: { ...values, kind: 'test', wert: null },
        verb: 'Eingetragen',
      }),
    ).toBe('Eingetragen: Physik, Test vom 26.11.2026, noch ohne Note.');
  });

  it('sagt, was gelöscht wurde', () => {
    expect(deletedText(noteA)).toBe(
      'Gelöscht: Latein, Klausur vom 05.10.2026.',
    );
  });
});
