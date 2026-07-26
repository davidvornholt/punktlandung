import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';

import {
  FachNotFound,
  FachSchoolYearNotFound,
} from '#/features/faecher/errors/fach-errors.ts';
import {
  HalbjahrAlreadyExists,
  HalbjahrExcludesNoten,
  NotensystemImmutableWithNoten,
  SchoolYearImmutableWithNoten,
  HalbjahrNotFound as SettingsHalbjahrNotFound,
} from '#/features/halbjahre/errors/halbjahr-errors.ts';
import {
  FachNotInSchoolYear,
  InvalidNotenwert,
  NoteNotFound,
  HalbjahrNotFound as NotenHalbjahrNotFound,
  NoteOutsideHalbjahr,
} from '#/features/noten/errors/noten-errors.ts';
import { ZeugnisHalbjahrNotFound } from '#/features/zeugnis/errors/zeugnis-errors.ts';

const errors = [
  new FachSchoolYearNotFound({ schoolYear: '2026/27' }),
  new FachNotFound({ fachId: 'mathematik', schoolYear: '2026/27' }),
  new HalbjahrAlreadyExists({ schoolYear: '2026/27', half: 1 }),
  new SettingsHalbjahrNotFound({ halbjahrId: 'halbjahr-1' }),
  new NotensystemImmutableWithNoten({
    halbjahrId: 'halbjahr-1',
    previous: 'sechser',
    next: 'punkte',
  }),
  new SchoolYearImmutableWithNoten({
    halbjahrId: 'halbjahr-1',
    previous: '2026/27',
    next: '2027/28',
  }),
  new HalbjahrExcludesNoten({
    halbjahrId: 'halbjahr-1',
    startsOn: '2026-08-01',
    endsOn: '2027-01-31',
  }),
  new NotenHalbjahrNotFound({ termId: 'halbjahr-1' }),
  new NoteNotFound({ noteId: 'note-1' }),
  new InvalidNotenwert({ wert: 16, system: 'punkte' }),
  new NoteOutsideHalbjahr({
    datum: '2027-02-01',
    startsOn: '2026-08-01',
    endsOn: '2027-01-31',
  }),
  new FachNotInSchoolYear({
    fachId: 'mathematik',
    schoolYear: '2026/27',
  }),
  new ZeugnisHalbjahrNotFound({ termId: 'halbjahr-1' }),
] as const;

const stableTags = [
  'FachSchuljahrNichtGefunden',
  'FachNichtGefunden',
  'HalbjahrBelegungDoppelt',
  'HalbjahrNichtGefunden',
  'NotensystemMitNotenUnveraenderlich',
  'SchuljahrMitNotenUnveraenderlich',
  'HalbjahrSchliesstNotenAus',
  'HalbjahrNichtGefunden',
  'NoteNichtGefunden',
  'UngueltigerNotenwert',
  'NoteAusserhalbHalbjahr',
  'FachNichtImSchuljahr',
  'ZeugnisHalbjahrNichtGefunden',
] as const;

describe('Effect error tag contract', () => {
  it('keeps all 13 pre-rename discriminators', () => {
    expect(errors.map((error) => error._tag)).toEqual([...stableTags]);
  });

  it('keeps existing catchTag recovery paths working', () => {
    const recovered = Effect.runSync(
      Effect.fail(errors[1]).pipe(
        Effect.catchTag('FachNichtGefunden', () => Effect.succeed('caught')),
      ),
    );
    expect(recovered).toBe('caught');
  });
});
