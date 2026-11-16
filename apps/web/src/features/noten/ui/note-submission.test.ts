import { describe, expect, it } from 'bun:test';

import type { NotenFields } from '../schemas/note-schema.ts';
import { createSubmissionIds } from './note-submission.ts';

const fields: NotenFields = {
  subjectId: 'fach-1',
  kind: 'klausur',
  wert: 2,
  gewicht: 1,
  datum: '2026-03-04',
  notiz: null,
};

const counter = () => {
  let next = 0;
  return () => {
    next += 1;
    return `id-${next}`;
  };
};

describe('createSubmissionIds', () => {
  it('behält die ID, wenn dieselben Eingaben erneut abgeschickt werden', () => {
    const ids = createSubmissionIds(counter());
    expect(ids.idFor('hj-1', fields)).toBe('id-1');
    expect(ids.idFor('hj-1', { ...fields })).toBe('id-1');
  });

  it('vergibt eine neue ID, sobald sich eine Eingabe geändert hat', () => {
    const ids = createSubmissionIds(counter());
    ids.idFor('hj-1', fields);
    expect(ids.idFor('hj-1', { ...fields, wert: 3 })).toBe('id-2');
    expect(ids.idFor('hj-2', { ...fields, wert: 3 })).toBe('id-3');
  });

  it('vergibt nach einer gespeicherten Abgabe eine neue ID, auch für gleiche Eingaben', () => {
    const ids = createSubmissionIds(counter());
    ids.idFor('hj-1', fields);
    ids.settle();
    expect(ids.idFor('hj-1', fields)).toBe('id-2');
  });
});
