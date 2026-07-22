CREATE TABLE "school_year_subject" (
	"school_year" text NOT NULL,
	"subject_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"written_share" integer,
	"klausur_weight" numeric(4, 2) DEFAULT '1' NOT NULL,
	"test_weight" numeric(4, 2) DEFAULT '1' NOT NULL,
	"muendlich_weight" numeric(4, 2) DEFAULT '1' NOT NULL,
	"gfs_weight" numeric(4, 2) DEFAULT '1' NOT NULL,
	"sonstige_weight" numeric(4, 2) DEFAULT '1' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "school_year_subject_school_year_subject_id_unique" UNIQUE("school_year","subject_id")
);
--> statement-breakpoint
CREATE TABLE "school_year_subject_set" (
	"school_year" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_year_subject" ADD CONSTRAINT "school_year_subject_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_day" ADD CONSTRAINT "study_day_day_subject_unique" UNIQUE NULLS NOT DISTINCT("day","subject_id");--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_school_year_half_unique" UNIQUE("school_year","half");