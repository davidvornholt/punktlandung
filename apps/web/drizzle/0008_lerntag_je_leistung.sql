CREATE TABLE "study_day_grade" (
	"study_day_id" text NOT NULL,
	"grade_id" text NOT NULL,
	CONSTRAINT "study_day_grade_unique" UNIQUE("study_day_id","grade_id")
);
--> statement-breakpoint
ALTER TABLE "study_day_grade" ADD CONSTRAINT "study_day_grade_study_day_id_study_day_id_fk" FOREIGN KEY ("study_day_id") REFERENCES "public"."study_day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_day_grade" ADD CONSTRAINT "study_day_grade_grade_id_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grade"("id") ON DELETE cascade ON UPDATE no action;