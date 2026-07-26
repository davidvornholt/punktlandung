import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';

import type { NotenFields } from '../schemas/note-schema.ts';
import {
  edit,
  failUpdate,
  fields,
  installNotenListMocks,
  mutate,
  noteA,
  noteB,
  type Props,
  requireForm,
  restoreNotenListMocks,
  view,
} from './noten-list-harness.ts';

type ErrorMap = ReadonlyMap<string, unknown>;

const failure = { _tag: 'X', message: 'Das Halbjahr ist gesperrt.' };
const other = new Error('Verbindung weg');

/** Der Änderungsvorgang läuft gerade für diese Note. */
const saving = (id: string): Props => ({
  isPending: true,
  variables: { id },
});

beforeAll(() => {
  installNotenListMocks();
});

afterAll(() => {
  restoreNotenListMocks();
  mock.restore();
});

describe('NotenList: Formularverdrahtung', () => {
  it('schickt die Kennung der bearbeiteten Note mit der Änderung mit', () => {
    const { formProps } = view(noteA);

    (formProps.onSave as (values: NotenFields) => void)(fields);

    expect(mutate).toHaveBeenCalledWith({ ...fields, id: 'note-a' });
  });

  it('setzt das Formular für eine andere Note neu auf', () => {
    expect(requireForm(view(noteA)).key).toBe('note-a');
    expect(requireForm(view(noteB)).key).toBe('note-b');
  });

  it('schließt das Formular, wenn abgebrochen wird', () => {
    const { formProps, setEditTarget } = view(noteA);

    (formProps.onCancel as () => void)();

    expect(setEditTarget).toHaveBeenCalledWith(null);
  });

  it('zeigt den Fehler der gescheiterten Note in ihrem Formular', () => {
    const errors: ErrorMap = new Map([['note-a', failure]]);

    const atA = view(noteA, errors);
    const atB = view(noteB, errors);

    expect(atA.formProps.error).toBe('Das Halbjahr ist gesperrt.');
    expect(atB.formProps.error).toBe(null);
    expect((atB.cards.props.updateErrors as ErrorMap).get('note-a')).toBe(
      failure,
    );
  });

  it('meldet nur die gerade gespeicherte Note als beschäftigt', () => {
    const atA = view(noteA, new Map(), saving('note-a'));
    const atB = view(noteB, new Map(), saving('note-a'));

    expect(atA.formProps.pending).toBe(true);
    expect(atA.cards.props.editPending).toBe(true);
    expect(atB.formProps.pending).toBe(false);
    expect(atB.cards.props.editPending).toBe(false);
  });

  it('behält den Fehler einer Note, wenn eine zweite scheitert', () => {
    const known: ErrorMap = new Map([['note-a', failure]]);
    const { setUpdateErrors } = view(noteB, known);

    failUpdate(other, 'note-b');

    const [add] = setUpdateErrors.mock.calls[0] ?? [];
    const next = (add as (errors: ErrorMap) => ErrorMap)(known);
    expect(next.get('note-a')).toBe(failure);
    expect(next.get('note-b')).toBe(other);
  });

  it('nimmt den Fehler zurück, sobald die Note wieder geöffnet wird', () => {
    const known: ErrorMap = new Map<string, unknown>([
      ['note-a', failure],
      ['note-b', other],
    ]);
    const { cards, setEditTarget, setUpdateErrors } = view(null, known);

    edit(cards, noteA, { focus: () => undefined });

    const [drop] = setUpdateErrors.mock.calls[0] ?? [];
    const next = (drop as (errors: ErrorMap) => ErrorMap)(known);
    expect(next.has('note-a')).toBe(false);
    expect(next.get('note-b')).toBe(other);
    expect(setEditTarget).toHaveBeenCalledWith(noteA);
  });

  it('nimmt den Fehler zurück, sobald dieselbe Note erneut gespeichert wird', () => {
    const known: ErrorMap = new Map([['note-a', failure]]);
    const { formProps, setUpdateErrors } = view(noteA, known);

    (formProps.onSave as (values: NotenFields) => void)(fields);

    const [drop] = setUpdateErrors.mock.calls[0] ?? [];
    expect((drop as (errors: ErrorMap) => ErrorMap)(known).has('note-a')).toBe(
      false,
    );
  });
});
