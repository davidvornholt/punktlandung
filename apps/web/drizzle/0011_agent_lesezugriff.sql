-- Die Rolle punktlandung_agent liest für den Befehl `punktlandung` Halbjahre,
-- Fächer und Noten, sonst nichts: keine Lerntage, keine Vorlagen und keine
-- Anmeldedaten. Auf prod-1 legt die Infrastruktur sie vor dieser Migration als
-- Login-Rolle mit Peer-Authentifizierung an, und die Rolle der App darf keine
-- Rollen anlegen; fehlt sie dort, scheitert das Deployment hier. Entwicklungs-,
-- CI- und Preview-Datenbanken bekommen eine Rolle ohne Login, damit die Rechte
-- und ihre Tests auch dort laufen.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'punktlandung_agent') THEN
    CREATE ROLE punktlandung_agent NOLOGIN;
  END IF;
EXCEPTION
  -- Die Migration einer anderen Datenbank hat sie zwischen Prüfung und Anlegen angelegt.
  WHEN duplicate_object OR unique_violation THEN NULL;
END
$$;
--> statement-breakpoint
GRANT SELECT ON TABLE term, grade, subject, school_year_subject, school_year_subject_set TO punktlandung_agent;
