CREATE TABLE "preparation_template" (
	"kind" "grade_kind" PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grade" ADD COLUMN "preparation" text;