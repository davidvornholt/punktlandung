import { PgSelectBase } from 'drizzle-orm/pg-core';
import {
  drizzle,
  type PgRemoteDatabase,
  type RemoteCallback,
} from 'drizzle-orm/pg-proxy';
import { QueryPromise } from 'drizzle-orm/query-promise';
import { Context, Effect, Effectable, Layer, Result } from 'effect';
import { SqlClient } from 'effect/sql/SqlClient';
import { SqlError, UnknownError } from 'effect/sql/SqlError';

/*
 * Drizzle über den Effect-SqlClient, portiert aus `@effect/sql-drizzle/Pg`,
 * das es für Effect 4 nicht mehr gibt. Eine Drizzle-Abfrage ist hier selbst ein
 * Effect. Beim Ausführen merkt sie sich die Services des aufrufenden Fibers;
 * der Callback führt die Anweisung mit genau diesen Services aus. Liegt der
 * Fiber in `sql.withTransaction`, gehört die Transaktionsverbindung dazu, und
 * die Anweisung läuft auf ihr statt auf einer freien Verbindung des Pools.
 */

/**
 * Services und Abbruchsignal der Abfrage, die gerade ausgeführt wird. Drizzle
 * ruft den Callback synchron aus `execute()` heraus auf, solange weder Cache
 * noch Tracing eingerichtet sind; nur in diesem Fenster sind die Werte gesetzt.
 */
let currentContext: Context.Context<never> | undefined;
let currentSignal: AbortSignal | undefined;

const executeWith = <A>(
  context: Context.Context<never>,
  signal: AbortSignal,
  execute: () => Promise<A>,
): Promise<A> => {
  const previousContext = currentContext;
  const previousSignal = currentSignal;
  currentContext = context;
  currentSignal = signal;
  try {
    return execute();
  } finally {
    currentContext = previousContext;
    currentSignal = previousSignal;
  }
};

const queryFailed = (cause: unknown): SqlError =>
  new SqlError({
    reason: new UnknownError({
      cause,
      message: 'Failed to execute QueryPromise',
    }),
  });

const queryProto = Effectable.Prototype<Effect.Effect<unknown, SqlError>>({
  label: 'PgDrizzleQuery',
  evaluate(fiber) {
    // biome-ignore lint/nursery/noThisOutsideOfClass: Effect ruft `evaluate` mit der gepatchten Drizzle-Abfrage als `this` auf.
    const query = this as unknown as QueryPromise<unknown>;
    return Effect.callback<unknown, SqlError>((resume, signal) => {
      let out: Promise<unknown>;
      try {
        out = executeWith(fiber.context, signal, () => query.execute());
      } catch (cause) {
        resume(Effect.fail(queryFailed(cause)));
        return;
      }
      out.then(
        (value) => resume(Effect.succeed(value)),
        (cause: unknown) => resume(Effect.fail(queryFailed(cause))),
      );
      // Eine Unterbrechung bricht die Anweisung ab und wartet auf ihr Ende,
      // bevor die Transaktion oder der Pool die Verbindung schließt.
      return Effect.promise(() => out.catch(() => undefined));
    });
  },
});

const patch = (prototype: object): void => {
  if (Effect.isEffect(prototype)) {
    return;
  }
  Object.defineProperties(
    prototype,
    Object.getOwnPropertyDescriptors(queryProto),
  );
};

declare module 'drizzle-orm' {
  interface QueryPromise<T> extends Effect.Effect<T, SqlError> {}
}

// `PgSelectBase` bekommt die Methoden von `QueryPromise` nur kopiert und erbt
// sie nicht; beide Prototypen brauchen deshalb den Patch.
patch(QueryPromise.prototype);
patch(PgSelectBase.prototype);

const makeRemoteCallback = Effect.gen(function* () {
  const client = yield* SqlClient;
  const constructionContext = yield* Effect.context<never>();
  const callback: RemoteCallback = (sql, params, method) => {
    const statement = client.unsafe(sql, params);
    // Ohne ausgewählte Felder fragt Drizzle `execute` an und gibt das
    // Treiberergebnis unverändert zurück; sonst `all` mit Zeilen als Arrays,
    // die Drizzle selbst den Feldern zuordnet.
    const rows: Effect.Effect<ReadonlyArray<unknown>, SqlError> = method ===
    'execute'
      ? Effect.map(statement.raw, (result) => [result])
      : statement.values;
    return Effect.runPromiseWith(currentContext ?? constructionContext)(
      Effect.result(rows),
      { signal: currentSignal },
    ).then((result) => {
      if (Result.isFailure(result)) {
        throw result.failure.cause;
      }
      // Drizzle liest die Zeilen nur; die veränderliche Signatur ist seine.
      return { rows: result.success as Array<unknown> };
    });
  };
  return callback;
});

/** Drizzle-Zugriff, der in `sql.withTransaction` auf der Transaktion läuft. */
export class PgDrizzle extends Context.Service<PgDrizzle, PgRemoteDatabase>()(
  'punktlandung/shared/db/PgDrizzle',
) {
  static readonly layer = Layer.effect(
    PgDrizzle,
    Effect.map(makeRemoteCallback, (callback) => drizzle(callback)),
  );
}
