CREATE TYPE "public"."klassenstufe" AS ENUM('5', '6', '7', '8', '9', '10', 'J1', 'J2');--> statement-breakpoint
ALTER TABLE "term" ADD COLUMN "klassenstufe" "klassenstufe";--> statement-breakpoint
DO $$
DECLARE unbekannt text;
BEGIN
  SELECT string_agg(DISTINCT "label", ', ')
    INTO unbekannt
    FROM "term"
   WHERE upper(split_part("label", '.', 1))
         NOT IN ('5', '6', '7', '8', '9', '10', 'K1', 'K2', 'J1', 'J2');
  IF unbekannt IS NOT NULL THEN
    RAISE EXCEPTION 'Migration abgebrochen: Aus diesen Halbjahr-Bezeichnungen lässt sich keine Klassenstufe ableiten: %. Passen Sie sie auf das Muster "10.1" bzw. "J1.2" an und starten Sie die Migration erneut.', unbekannt;
  END IF;
END $$;--> statement-breakpoint
UPDATE "term" SET "klassenstufe" = (CASE upper(split_part("label", '.', 1))
	WHEN 'K1' THEN 'J1'
	WHEN 'K2' THEN 'J2'
	ELSE upper(split_part("label", '.', 1))
END)::"public"."klassenstufe";--> statement-breakpoint
ALTER TABLE "term" ALTER COLUMN "klassenstufe" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "term" DROP COLUMN "label";--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_half_valid" CHECK ("term"."half" in (1, 2));
