-- Ein Schuljahr ist eine Klassenstufe: Beide Halbjahre teilen sie und damit
-- das Notensystem, in dem der gemeinsame Fachstand des Schuljahrs rechnet.
-- Eine CHECK-Bedingung sieht nur eine Zeile; erst die Exclusion-Constraints
-- vergleichen alle Halbjahre desselben Schuljahrs, auch unter Nebenläufigkeit.
-- Drizzle kann sie nicht im Schema ausdrücken, deshalb ist dies eine
-- `drizzle-kit generate --custom`-Migration. Für `<>` auf Enum- und
-- Textspalten braucht GiST die Contrib-Erweiterung btree_gist (trusted).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
LOCK TABLE "term" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
DO $$
DECLARE gemischte_schuljahre text;
BEGIN
	SELECT string_agg("school_year", ', ' ORDER BY "school_year")
	INTO gemischte_schuljahre
	FROM (
		SELECT "school_year"
		FROM "term"
		GROUP BY "school_year"
		HAVING count(DISTINCT "klassenstufe") > 1 OR count(DISTINCT "system") > 1
	) AS gemischt;

	IF gemischte_schuljahre IS NOT NULL THEN
		RAISE EXCEPTION 'Migration abgebrochen: In diesen Schuljahren haben die beiden Halbjahre unterschiedliche Klassenstufen oder Notensysteme: %. Setzen Sie beide Halbjahre jedes dieser Schuljahre auf dieselbe Klassenstufe und starten Sie die Migration erneut.', gemischte_schuljahre;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_school_year_klassenstufe_shared" EXCLUDE USING gist ("school_year" WITH =, "klassenstufe" WITH <>);--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_school_year_system_shared" EXCLUDE USING gist ("school_year" WITH =, "system" WITH <>);
