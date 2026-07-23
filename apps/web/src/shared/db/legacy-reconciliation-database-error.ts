import { Data } from 'effect';

export class LegacyReconciliationDatabaseError extends Data.TaggedError(
  'LegacyReconciliationDatabaseError',
)<{ readonly message: string; readonly cause: unknown }> {}
