-- Der Wertungsbereich gehört zur Leistungsart, nicht zur Verkündung der
-- Lehrkraft: Klausur, GFS und Test sind schriftliche Arbeiten, Mündlich und
-- Sonstige der zweite Bereich. Er wird deshalb im Code abgeleitet statt je
-- Fach gespeichert. Gesammelt zählt nur noch der Test.
UPDATE "subject" SET "weighting" = jsonb_set(
	"weighting",
	'{arten}',
	(
		SELECT jsonb_object_agg(
			art,
			(wert - 'bereich') || jsonb_build_object(
				'sammlung',
				CASE WHEN art = 'test' THEN wert -> 'sammlung' ELSE '"einzeln"'::jsonb END
			)
		)
		FROM jsonb_each("weighting" -> 'arten') AS eintrag(art, wert)
	)
);--> statement-breakpoint
UPDATE "school_year_subject" SET "weighting" = jsonb_set(
	"weighting",
	'{arten}',
	(
		SELECT jsonb_object_agg(
			art,
			(wert - 'bereich') || jsonb_build_object(
				'sammlung',
				CASE WHEN art = 'test' THEN wert -> 'sammlung' ELSE '"einzeln"'::jsonb END
			)
		)
		FROM jsonb_each("weighting" -> 'arten') AS eintrag(art, wert)
	)
);--> statement-breakpoint
ALTER TABLE "subject" ALTER COLUMN "weighting" SET DEFAULT '{"verhaeltnis":null,"arten":{"klausur":{"gewicht":1,"sammlung":"einzeln"},"test":{"gewicht":1,"sammlung":"gesammelt"},"muendlich":{"gewicht":1,"sammlung":"einzeln"},"gfs":{"gewicht":1,"sammlung":"einzeln"},"sonstige":{"gewicht":1,"sammlung":"einzeln"}}}'::jsonb;--> statement-breakpoint
ALTER TABLE "school_year_subject" ALTER COLUMN "weighting" SET DEFAULT '{"verhaeltnis":null,"arten":{"klausur":{"gewicht":1,"sammlung":"einzeln"},"test":{"gewicht":1,"sammlung":"gesammelt"},"muendlich":{"gewicht":1,"sammlung":"einzeln"},"gfs":{"gewicht":1,"sammlung":"einzeln"},"sonstige":{"gewicht":1,"sammlung":"einzeln"}}}'::jsonb;
