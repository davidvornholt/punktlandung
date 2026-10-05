import { describe, expect, it } from 'bun:test';
import { SqlError } from '@effect/sql/SqlError';
import { file, Glob } from 'bun';
import { Cause, Runtime } from 'effect';

import {
  FachNotFound,
  FachSchoolYearNotFound,
} from '#/features/faecher/errors/fach-errors.ts';
import {
  HalbjahrAlreadyExists,
  HalbjahrDeletionBlockedByNoten,
  HalbjahrDeletionConsequenceChanged,
  HalbjahrExcludesNoten,
  HalbjahrNotFound,
  KlassenstufeCorrectionBlockedByNoten,
  KlassenstufeDiffersInSchoolYear,
  NotensystemImmutableWithNoten,
  SchoolYearImmutableWithNoten,
} from '#/features/halbjahre/errors/halbjahr-errors.ts';
import { isProtectedHalbjahrDeletionError } from '#/features/halbjahre/ui/halbjahr-deletion-model.ts';
import {
  FachNotInSchoolYear,
  InvalidNotenwert,
  NoteNotFound,
  HalbjahrNotFound as NotenHalbjahrNotFound,
  NotenwertRequired,
  NoteOutsideHalbjahr,
} from '#/features/noten/errors/noten-errors.ts';
import { ZeugnisHalbjahrNotFound } from '#/features/zeugnis/errors/zeugnis-errors.ts';
import { GewichtungInvalid } from '#/shared/noten/fach-gewichtung.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { DomainError, domainErrorAdapter } from './domain-errors.ts';

const fallbackText = 'Die Verbindung ist fehlgeschlagen.';

const errors: ReadonlyArray<DomainError> = [
  new FachNotFound({ fachId: 'mathe', schoolYear: '2026/27' }),
  new FachSchoolYearNotFound({ schoolYear: '2026/27' }),
  new GewichtungInvalid({ fachId: 'mathe' }),
  new HalbjahrAlreadyExists({ schoolYear: '2026/27', half: 2 }),
  new HalbjahrDeletionBlockedByNoten({
    halbjahrId: 'halbjahr-1',
    notenCount: 3,
  }),
  new HalbjahrDeletionConsequenceChanged({
    halbjahrId: 'halbjahr-1',
    expectedFinalInSchoolYear: false,
    actualFinalInSchoolYear: true,
  }),
  new HalbjahrExcludesNoten({
    halbjahrId: 'halbjahr-1',
    startsOn: '2026-08-01',
    endsOn: '2027-01-31',
  }),
  new HalbjahrNotFound({ halbjahrId: 'halbjahr-1' }),
  new KlassenstufeCorrectionBlockedByNoten({
    schoolYear: '2026/27',
    half: 2,
    klassenstufe: '10',
  }),
  new KlassenstufeDiffersInSchoolYear({
    schoolYear: '2026/27',
    half: 1,
    klassenstufe: 'J1',
  }),
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
  new FachNotInSchoolYear({
    fachId: 'mathe',
    schoolYear: '2026/27',
  }),
  new NotenHalbjahrNotFound({ termId: 'halbjahr-1' }),
  new InvalidNotenwert({ wert: 16, system: 'punkte' }),
  new NoteNotFound({ noteId: 'note-1' }),
  new NoteOutsideHalbjahr({
    datum: '2027-02-01',
    startsOn: '2026-08-01',
    endsOn: '2027-01-31',
  }),
  new NotenwertRequired({ kind: 'muendlich' }),
  new ZeugnisHalbjahrNotFound({ termId: 'halbjahr-1' }),
];

/** Wie TanStack Start: Der Server kodiert, JSON überquert das Netz, der Client baut. */
const transported = (error: unknown): unknown => {
  if (!domainErrorAdapter.test(error)) {
    throw new Error('Der Adapter übernimmt diesen Fehler nicht.');
  }
  const wire = JSON.stringify(domainErrorAdapter.toSerializable(error));
  return domainErrorAdapter.fromSerializable(JSON.parse(wire));
};

/** Alle Fehlerklassen, die Serverfunktionen erwartet scheitern lassen. */
const declaredErrorClasses = async (): Promise<ReadonlyArray<string>> => {
  const files = [
    ...(await Array.fromAsync(
      new Glob('features/*/errors/*.ts').scan({
        absolute: true,
        cwd: import.meta.dir,
      }),
    )),
    `${import.meta.dir}/shared/noten/fach-gewichtung.ts`,
  ];
  const sources = await Promise.all(files.map((path) => file(path).text()));
  return sources.flatMap((source) =>
    [
      ...source.matchAll(
        /export class (?<name>\w+) extends Schema\.TaggedError/gu,
      ),
    ].map((match) => match.groups?.name ?? ''),
  );
};

const sorted = (names: ReadonlyArray<string>) =>
  [...names].sort((a, b) => a.localeCompare(b));

describe('domain error transport', () => {
  it('covers every expected error class of the server functions', async () => {
    expect(sorted(DomainError.members.map((member) => member.name))).toEqual(
      sorted(await declaredErrorClasses()),
    );
    expect(new Set(errors.map((error) => error.constructor))).toEqual(
      new Set(DomainError.members),
    );
  });

  it.each(errors.map((error) => [error._tag, error] as const))(
    'rebuilds %s on the client with its German message',
    (_tag, error) => {
      const received = transported(error);

      expect(received).toBeInstanceOf(error.constructor);
      expect(received).toEqual(error);
      expect(actionErrorText(received, fallbackText)).toBe(error.message);
    },
  );

  it('keeps the protected deletion check working after transport', () => {
    const blocked = new HalbjahrDeletionBlockedByNoten({
      halbjahrId: 'halbjahr-1',
      notenCount: 1,
    });

    expect(isProtectedHalbjahrDeletionError(transported(blocked))).toBe(true);
  });

  it('leaves infrastructure errors and defects to the generic text', () => {
    const infrastructure = [
      new SqlError({ message: 'connection terminated', cause: null }),
      Runtime.makeFiberFailure(Cause.die(new Error('kaputt'))),
      new TypeError('fetch failed'),
    ];

    for (const error of infrastructure) {
      expect(domainErrorAdapter.test(error)).toBe(false);
      // Ohne Adapter überträgt TanStack Start von einem Error nur die Meldung.
      const received = new Error(error.message);
      expect(actionErrorText(received, fallbackText)).toBe(fallbackText);
    }
  });
});
