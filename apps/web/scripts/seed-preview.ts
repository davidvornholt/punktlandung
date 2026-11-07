import process from 'node:process';
import { Cause, Console, Effect, Exit } from 'effect';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { databaseLayer } from '#/shared/db/database-layer.ts';
import { preservePostgresDates } from '#/shared/db/postgres-date.ts';
import type { SeedResult } from './preview-seed/seed.ts';
import { seedPreview } from './preview-seed/seed.ts';

/*
 * Füllt die leere Datenbank einer Pull-Request-Preview mit erfundenen
 * Beispieldaten. Der Preview-Host ruft das im Produktions-Image nach den
 * Migrationen auf, nur mit DATABASE_URL, ohne Netz und mit schreibgeschütztem
 * Dateisystem.
 */

const databaseUrl = Bun.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL ist nicht gesetzt.');
}

preservePostgresDates();

const report = (result: SeedResult) =>
  result.status === 'skipped'
    ? Console.log(
        `Die Datenbank enthält bereits App-Daten (${result.tables.join(', ')}); es werden keine Beispieldaten angelegt.`,
      )
    : Console.log(
        `Beispieldaten angelegt: ${result.counts.halbjahre} Halbjahre, ${result.counts.faecher} Fächer, ${result.counts.benotet} benotete und ${result.counts.ausstehend} ausstehende Leistungen, ${result.counts.lerntage} Lerntage.`,
      );

const exit = await Effect.runPromiseExit(
  seedPreview(berlinCalendarDate()).pipe(
    Effect.flatMap(report),
    Effect.provide(databaseLayer(databaseUrl)),
  ),
);

if (Exit.isFailure(exit)) {
  await Effect.runPromise(
    Console.error(
      `Die Beispieldaten konnten nicht angelegt werden; die Datenbank bleibt unverändert.\n${Cause.pretty(exit.cause)}`,
    ),
  );
  process.exitCode = 1;
}
