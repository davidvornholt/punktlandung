CREATE TABLE "grade_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Jede vorhandene Note ist eine verarbeitete Abgabe (ihre ID ist die der Abgabe), auch wenn sie vor dieser Tabelle gespeichert wurde.
INSERT INTO "grade_submission" ("id") SELECT "id" FROM "grade" ON CONFLICT DO NOTHING;
