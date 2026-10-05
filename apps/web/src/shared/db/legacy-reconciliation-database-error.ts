import { Schema } from 'effect';

export class LegacyReconciliationDatabaseError extends Schema.TaggedError<LegacyReconciliationDatabaseError>()(
  'LegacyReconciliationDatabaseError',
  { message: Schema.String, cause: Schema.Defect },
) {}
