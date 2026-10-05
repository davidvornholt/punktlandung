import { createSerializationAdapter } from '@tanstack/react-router';
import { Schema } from 'effect';

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

/**
 * Erwartete Fehler der Serverfunktionen. Ihre Meldung ist für die Oberfläche
 * geschrieben und darf sie deshalb erreichen. Infrastrukturfehler fehlen hier
 * bewusst: Von ihnen kommt nur die Meldung ohne `_tag` an, und die Oberfläche
 * zeigt ihren allgemeinen Text.
 */
export const DomainError = Schema.Union(
  FachNotFound,
  FachSchoolYearNotFound,
  GewichtungInvalid,
  HalbjahrAlreadyExists,
  HalbjahrDeletionBlockedByNoten,
  HalbjahrDeletionConsequenceChanged,
  HalbjahrExcludesNoten,
  HalbjahrNotFound,
  KlassenstufeCorrectionBlockedByNoten,
  KlassenstufeDiffersInSchoolYear,
  NotensystemImmutableWithNoten,
  SchoolYearImmutableWithNoten,
  FachNotInSchoolYear,
  InvalidNotenwert,
  NoteNotFound,
  NotenHalbjahrNotFound,
  NoteOutsideHalbjahr,
  NotenwertRequired,
  ZeugnisHalbjahrNotFound,
);

export type DomainError = typeof DomainError.Type;

/**
 * Ohne Adapter überträgt TanStack Start von jedem geworfenen Error nur die
 * Meldung; `_tag` und Felder gingen verloren. Der Adapter kodiert fachliche
 * Fehler über ihr Schema und baut beim Client wieder dieselbe Klasse.
 */
export const domainErrorAdapter = createSerializationAdapter({
  key: 'punktlandung-domain-error',
  test: Schema.is(DomainError),
  toSerializable: Schema.encodeSync(DomainError),
  fromSerializable: Schema.decodeUnknownSync(DomainError),
});
