import { ManagedRuntime } from 'effect';

import { DatabaseLive } from '#/shared/db/effect-client.ts';

/**
 * Prozessweite Effect-Runtime. Serverfunktionen (Entrypoints) übersetzen
 * Effect-Programme hiermit in Promises; Features bleiben Effect-basiert.
 */
export const runtime = ManagedRuntime.make(DatabaseLive);
