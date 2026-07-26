LOCK TABLE "grade" IN SHARE MODE;--> statement-breakpoint
DO $$
DECLARE inkompatible_noten text;
BEGIN
	SELECT string_agg(
		format('id=%L, Leistungsart=%L, Bereich=%L', "id", "kind", "area"),
		'; ' ORDER BY "id"
	)
	INTO inkompatible_noten
	FROM "grade"
	WHERE "area" <> (
		CASE
			WHEN "kind" IN ('klausur', 'test', 'gfs') THEN 'schriftlich'
			ELSE 'muendlich'
		END
	)::"public"."grade_area";

	IF inkompatible_noten IS NOT NULL THEN
		RAISE EXCEPTION 'Migration abgebrochen: Diese Noten verwenden einen Bereich, den das neue Modell aus der Leistungsart anders ableitet: %. Setzen Sie Klausur, Test und GFS auf "schriftlich" sowie Mündlich und Sonstige auf "muendlich" und starten Sie die Migration erneut.', inkompatible_noten;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "school_year_subject" ADD COLUMN "weighting" jsonb NOT NULL DEFAULT '{"verhaeltnis":null,"arten":{"klausur":{"bereich":"schriftlich","gewicht":1,"sammlung":"einzeln"},"test":{"bereich":"schriftlich","gewicht":1,"sammlung":"gesammelt"},"muendlich":{"bereich":"muendlich","gewicht":1,"sammlung":"einzeln"},"gfs":{"bereich":"schriftlich","gewicht":1,"sammlung":"einzeln"},"sonstige":{"bereich":"muendlich","gewicht":1,"sammlung":"einzeln"}}}'::jsonb;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "weighting" jsonb NOT NULL DEFAULT '{"verhaeltnis":null,"arten":{"klausur":{"bereich":"schriftlich","gewicht":1,"sammlung":"einzeln"},"test":{"bereich":"schriftlich","gewicht":1,"sammlung":"gesammelt"},"muendlich":{"bereich":"muendlich","gewicht":1,"sammlung":"einzeln"},"gfs":{"bereich":"schriftlich","gewicht":1,"sammlung":"einzeln"},"sonstige":{"bereich":"muendlich","gewicht":1,"sammlung":"einzeln"}}}'::jsonb;--> statement-breakpoint
-- Bestehende Fächer übernehmen ihre bisherige Gewichtung wortgetreu: jede
-- Leistungsart zählt weiter einzeln und behält ihr Gewicht, der Bereich folgt
-- dem bisherigen Standard je Art. So ändert die Migration keinen Schnitt;
-- Sammelnoten wählt man danach bewusst im Formular.
UPDATE "school_year_subject" SET "weighting" = jsonb_build_object(
	'verhaeltnis', CASE
		WHEN "written_share" IS NULL THEN 'null'::jsonb
		ELSE jsonb_build_object('schriftlich', "written_share", 'muendlich', 100 - "written_share")
	END,
	'arten', jsonb_build_object(
		'klausur', jsonb_build_object('bereich', 'schriftlich', 'gewicht', "klausur_weight", 'sammlung', 'einzeln'),
		'test', jsonb_build_object('bereich', 'schriftlich', 'gewicht', "test_weight", 'sammlung', 'einzeln'),
		'muendlich', jsonb_build_object('bereich', 'muendlich', 'gewicht', "muendlich_weight", 'sammlung', 'einzeln'),
		'gfs', jsonb_build_object('bereich', 'schriftlich', 'gewicht', "gfs_weight", 'sammlung', 'einzeln'),
		'sonstige', jsonb_build_object('bereich', 'muendlich', 'gewicht', "sonstige_weight", 'sammlung', 'einzeln')
	)
);--> statement-breakpoint
UPDATE "subject" SET "weighting" = jsonb_build_object(
	'verhaeltnis', CASE
		WHEN "written_share" IS NULL THEN 'null'::jsonb
		ELSE jsonb_build_object('schriftlich', "written_share", 'muendlich', 100 - "written_share")
	END,
	'arten', jsonb_build_object(
		'klausur', jsonb_build_object('bereich', 'schriftlich', 'gewicht', "klausur_weight", 'sammlung', 'einzeln'),
		'test', jsonb_build_object('bereich', 'schriftlich', 'gewicht', "test_weight", 'sammlung', 'einzeln'),
		'muendlich', jsonb_build_object('bereich', 'muendlich', 'gewicht', "muendlich_weight", 'sammlung', 'einzeln'),
		'gfs', jsonb_build_object('bereich', 'schriftlich', 'gewicht', "gfs_weight", 'sammlung', 'einzeln'),
		'sonstige', jsonb_build_object('bereich', 'muendlich', 'gewicht', "sonstige_weight", 'sammlung', 'einzeln')
	)
);--> statement-breakpoint
-- Ab hier schreibt allein die Anwendung die Gewichtung.
ALTER TABLE "school_year_subject" ALTER COLUMN "weighting" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subject" ALTER COLUMN "weighting" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "grade" DROP COLUMN "area";--> statement-breakpoint
DROP TYPE "public"."grade_area";
