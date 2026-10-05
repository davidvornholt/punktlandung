-- Die Klassenstufe eines Schuljahrs muss korrigierbar bleiben, wenn schon
-- beide Halbjahre existieren. Das geht nur, indem eine Anweisung beide Zeilen
-- zugleich ändert. Nicht aufschiebbare Exclusion-Constraints prüfen aber jede
-- Zeile sofort und sehen dabei die andere noch mit der alten Klassenstufe.
-- DEFERRABLE INITIALLY IMMEDIATE prüft erst am Ende der Anweisung; eine
-- einzelne abweichende Zeile bleibt ausgeschlossen. PostgreSQL kann die
-- Aufschiebbarkeit von Exclusion-Constraints nicht per ALTER CONSTRAINT
-- ändern, deshalb werden beide neu angelegt (wie 0009 eine
-- `drizzle-kit generate --custom`-Migration).
ALTER TABLE "term" DROP CONSTRAINT "term_school_year_klassenstufe_shared";--> statement-breakpoint
ALTER TABLE "term" DROP CONSTRAINT "term_school_year_system_shared";--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_school_year_klassenstufe_shared" EXCLUDE USING gist ("school_year" WITH =, "klassenstufe" WITH <>) DEFERRABLE INITIALLY IMMEDIATE;--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_school_year_system_shared" EXCLUDE USING gist ("school_year" WITH =, "system" WITH <>) DEFERRABLE INITIALLY IMMEDIATE;
