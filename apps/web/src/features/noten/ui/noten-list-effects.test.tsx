import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';

import {
  edit,
  expectedKeys,
  fallbackTarget,
  fallbackTriggerRef,
  finishDelete,
  finishUpdate,
  installNotenListMocks,
  invalidated,
  noteA,
  noteB,
  releaseInvalidations,
  rememberTrigger,
  restoreNotenListMocks,
  view,
} from './noten-list-harness.ts';

/**
 * Wartet, bis jede anhängige Mikroaufgabe gelaufen ist. Ohne das griffe die
 * Zusicherung, dass noch nichts geschlossen wurde, eine Mikroaufgabe zu früh
 * und wäre auch dann erfüllt, wenn der Nachlauf die Entwertung gar nicht
 * abwartete.
 */
const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

/** Schließt einen Mutationsnachlauf ab, den die Entwertung noch aufhält. */
const settle = async (run: Promise<unknown> | undefined) => {
  releaseInvalidations();
  await run;
};

beforeAll(() => {
  installNotenListMocks();
});

afterAll(() => {
  restoreNotenListMocks();
  mock.restore();
});

describe('NotenList: Nachlauf der Mutationen', () => {
  it('schließt das Formular erst, wenn Noten, Verlauf und Zeugnis entwertet sind', async () => {
    const { setEditTarget } = view(noteA);

    const run = finishUpdate('note-a');
    await flush();
    expect(setEditTarget).not.toHaveBeenCalled();
    await settle(run);

    expect(invalidated).toEqual(expectedKeys);
    const [close] = setEditTarget.mock.calls[0] ?? [];
    expect((close as (open: unknown) => unknown)(noteA)).toBe(null);
  });

  it('lässt eine inzwischen geöffnete andere Note offen', async () => {
    const { setEditTarget } = view(noteB);

    await settle(finishUpdate('note-a'));

    const [close] = setEditTarget.mock.calls[0] ?? [];
    expect((close as (open: unknown) => unknown)(noteB)).toBe(noteB);
  });

  it('entwertet auch nach dem Löschen Noten, Verlauf und Zeugnis', async () => {
    view(null);

    await settle(finishDelete('note-a'));

    expect(invalidated).toEqual(expectedKeys);
  });

  /**
   * Der Zeilenknopf, der das Formular geöffnet hat, verschwindet mit dem
   * Neuabruf, sobald die Note gelöscht wurde. Ohne Auffangziel fiele der Fokus
   * auf <body>, und die Tastaturbedienung begänne wieder ganz oben.
   */
  it('gibt den Fokus nach dem Löschen an das Auffangziel der Liste', async () => {
    const { root } = view(null);
    const fallback = { focus: mock(() => undefined) };

    expect(fallbackTarget(root)).toBe(fallbackTriggerRef);
    /* Ohne tabIndex nimmt der Abschnitt den Fokus gar nicht erst an. */
    expect(root.props.tabIndex).toBe(-1);
    fallbackTriggerRef.current = fallback;
    await settle(finishDelete('note-a'));

    expect(fallback.focus).toHaveBeenCalledTimes(1);
  });

  it('merkt sich den Zeilenknopf, der das Formular geöffnet hat', () => {
    const { cards, setEditTarget } = view(null);
    const trigger = { focus: () => undefined };

    edit(cards, noteA, trigger);

    expect(rememberTrigger).toHaveBeenCalledWith(trigger as unknown as never);
    expect(setEditTarget).toHaveBeenCalledWith(noteA);
  });
});
