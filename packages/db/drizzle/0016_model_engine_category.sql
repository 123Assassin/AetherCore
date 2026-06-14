ALTER TABLE "model_engines" ADD COLUMN "category" varchar(20) DEFAULT 'reasoning' NOT NULL;--> statement-breakpoint
ALTER TABLE "model_engines" ADD CONSTRAINT "model_engines_category_check" CHECK ("model_engines"."category" in ('reasoning', 'vision'));
