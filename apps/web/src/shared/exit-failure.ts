import { Cause, Exit, Option } from 'effect';

/**
 * Hülle für alles, was kein erwarteter `Error` ist. Sie trägt nur die Meldung
 * des ersten Fehlers im Cause und keine seiner Felder, damit kein `_tag` und
 * keine Datenbankdetails zur Oberfläche gelangen.
 */
export class UnexpectedFailure extends Error {
  readonly failureCause: Cause.Cause<unknown>;

  constructor(failureCause: Cause.Cause<unknown>) {
    const [head] = Cause.prettyErrors(failureCause);
    super(head?.message || 'An error has occurred');
    this.name = head ? `(UnexpectedFailure) ${head.name}` : 'UnexpectedFailure';
    this.failureCause = failureCause;
  }
}

/**
 * Wirft einen erwarteten Fehler aus dem Fehlerkanal unverändert, damit
 * TanStack Start einen fachlichen Fehler mit `_tag` und Meldung an die
 * Oberfläche übertragen kann (`src/domain-errors.ts`). Defekte,
 * Unterbrechungen und Fehlerwerte ohne `Error`-Prototyp werden zum
 * `UnexpectedFailure`; davon kommt beim Client nur die Meldung an.
 */
export const throwExitFailure = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  const failure = Cause.findErrorOption(exit.cause);
  throw Option.isSome(failure) && failure.value instanceof Error
    ? failure.value
    : new UnexpectedFailure(exit.cause);
};
