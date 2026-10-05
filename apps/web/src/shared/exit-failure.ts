import { Cause, Exit, Option, Runtime } from 'effect';

/**
 * Wirft einen erwarteten Fehler aus dem Fehlerkanal unverändert, damit
 * TanStack Start einen fachlichen Fehler mit `_tag` und Meldung an die
 * Oberfläche übertragen kann (`src/domain-errors.ts`). Defekte,
 * Unterbrechungen und Fehlerwerte ohne `Error`-Prototyp bleiben ein
 * `FiberFailure`; davon kommt beim Client nur die Meldung an.
 */
export const throwExitFailure = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  const failure = Cause.failureOption(exit.cause);
  throw Option.isSome(failure) && failure.value instanceof Error
    ? failure.value
    : Runtime.makeFiberFailure(exit.cause);
};
