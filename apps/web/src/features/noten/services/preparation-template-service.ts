import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';

import { preparationTemplateTable } from '#/shared/db/schema.ts';
import type { PlanbareLeistungsart } from '#/shared/noten/notenwert.ts';
import { planbareLeistungsarten } from '#/shared/noten/notenwert.ts';
import type { PreparationTemplateInput } from '../schemas/note-schema.ts';

/**
 * Die eingebaute Vorlage: ein Thema als Platzhalter, damit die erste
 * Aufgabenzeile schon dasteht und kopiert werden kann, und Platz für Notizen.
 */
export const defaultPreparationTemplate = [
  '## Themen',
  '',
  '- [ ] Erstes Thema',
  '',
  '## Notizen',
  '',
].join('\n');

export type PreparationTemplates = Readonly<
  Record<PlanbareLeistungsart, string>
>;

/** Die Vorlage je planbarer Leistungsart; fehlende Zeilen füllt die eingebaute. */
export const loadPreparationTemplates = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  const rows = yield* db.select().from(preparationTemplateTable);
  const stored = new Map(rows.map((row) => [row.kind, row.content]));
  return Object.fromEntries(
    planbareLeistungsarten.map((kind) => [
      kind,
      stored.get(kind) ?? defaultPreparationTemplate,
    ]),
  ) as PreparationTemplates;
});

export const savePreparationTemplate = (input: PreparationTemplateInput) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db
      .insert(preparationTemplateTable)
      .values({ kind: input.kind, content: input.content })
      .onConflictDoUpdate({
        target: preparationTemplateTable.kind,
        set: { content: input.content, updatedAt: new Date() },
      });
  });
