import { type Effect, ManagedRuntime } from 'effect';

import { DatabaseLive } from '#/shared/db/effect-client.ts';
import { throwExitFailure } from '#/shared/exit-failure.ts';

/**
 * Prozessweite Effect-Runtime. Serverfunktionen (Entrypoints) übersetzen
 * Effect-Programme mit `runServerEffect` in Promises; Features bleiben
 * Effect-basiert.
 */
export const runtime = ManagedRuntime.make(DatabaseLive);

type RuntimeContext = ManagedRuntime.ManagedRuntime.Context<typeof runtime>;

/** Führt das Effect-Programm einer Serverfunktion aus. */
export const runServerEffect = <A, E>(
  effect: Effect.Effect<A, E, RuntimeContext>,
): Promise<A> => runtime.runPromiseExit(effect).then(throwExitFailure);
