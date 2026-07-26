import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';

import {
  FachId,
  FachInput,
  FachUpdate,
  FaecherQuery,
} from '#/features/faecher/schemas/fach-schema.ts';
import {
  HalbjahrInput,
  HalbjahrUpdate,
} from '#/features/halbjahre/schemas/halbjahr-schema.ts';
import { StudyDayInput } from '#/features/lernen/schemas/study-day-schema.ts';
import {
  NoteId,
  NoteInput,
  NotenQuery,
  NoteUpdate,
} from '#/features/noten/schemas/note-schema.ts';
import { ZeugnisQuery } from '#/features/zeugnis/schemas/zeugnis-schema.ts';

const fachInput = {
  schoolYear: '2026/27',
  name: 'Mathematik',
  shortName: 'M',
  writtenShare: 50,
  klausurWeight: 2,
  testWeight: 1,
  muendlichWeight: 1,
  gfsWeight: 1,
  sonstigeWeight: 1,
};

const halbjahrInput = {
  klassenstufe: '10' as const,
  schoolYear: '2026/27',
  half: 1 as const,
  startsOn: '2026-08-01',
  endsOn: '2027-01-31',
};

const noteFields = {
  subjectId: 'mathematik',
  kind: 'klausur' as const,
  area: 'schriftlich' as const,
  wert: 2,
  gewicht: 1,
  datum: '2026-10-01',
  notiz: null,
};

const noteInput = {
  termId: 'halbjahr-1',
  ...noteFields,
};

const cases: ReadonlyArray<
  readonly [name: string, schema: Schema.Schema.AnyNoContext, payload: unknown]
> = [
  ['Fächer query', FaecherQuery, { schoolYear: '2026/27' }],
  ['Fach create', FachInput, fachInput],
  ['Fach update', FachUpdate, { id: 'mathematik', ...fachInput }],
  ['Fach archive', FachId, { id: 'mathematik', schoolYear: '2026/27' }],
  ['Halbjahr create', HalbjahrInput, halbjahrInput],
  ['Halbjahr update', HalbjahrUpdate, { id: 'halbjahr-1', ...halbjahrInput }],
  [
    'Lerntag create',
    StudyDayInput,
    {
      day: '2026-10-01',
      subjectId: 'mathematik',
      minutes: 30,
      notiz: 'Analysis',
    },
  ],
  ['Noten query', NotenQuery, { termId: 'halbjahr-1' }],
  ['Note create', NoteInput, noteInput],
  ['Note update', NoteUpdate, { id: 'note-1', ...noteFields }],
  ['Note delete', NoteId, { id: 'note-1' }],
  ['Zeugnis query', ZeugnisQuery, { termId: 'halbjahr-1' }],
] as const;

describe('server request wire contract', () => {
  for (const [name, schema, payload] of cases) {
    it(`accepts the pre-rename ${name} payload`, async () => {
      const validator = Schema.standardSchemaV1(schema);
      const result = await validator['~standard'].validate(payload);
      expect(result).toHaveProperty('value');
      expect(result).not.toHaveProperty('issues');
    });
  }
});
