import type {
  HalbjahrDeletionInput,
  HalbjahrInput,
} from '../schemas/halbjahr-schema.ts';
import {
  createHalbjahrFn,
  deleteHalbjahrFn,
  listHalbjahreFn,
  updateHalbjahrFn,
} from '../server/halbjahr-fns.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';

export type HalbjahrOperations = {
  readonly create: (values: HalbjahrInput) => Promise<unknown>;
  readonly delete: (values: HalbjahrDeletionInput) => Promise<unknown>;
  readonly list: () => Promise<ReadonlyArray<HalbjahrWithNotenCount>>;
  readonly update: (
    values: HalbjahrInput & { readonly id: string },
  ) => Promise<unknown>;
};

export const liveHalbjahrOperations: HalbjahrOperations = {
  create: (values) => createHalbjahrFn({ data: values }),
  delete: (values) => deleteHalbjahrFn({ data: values }),
  list: () => listHalbjahreFn(),
  update: (values) => updateHalbjahrFn({ data: values }),
};
