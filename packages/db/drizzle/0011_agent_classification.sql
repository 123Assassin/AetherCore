ALTER TABLE "ai_agents" DROP CONSTRAINT IF EXISTS "ai_agents_key_unique";
--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "grade" varchar(50);
--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "subject" varchar(50);
--> statement-breakpoint
CREATE INDEX "idx_ai_agents_key_grade_subject" ON "ai_agents" USING btree ("key", "grade", "subject");
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_ai_agents_key_grade_subject" ON "ai_agents" USING btree ("key", coalesce("grade", ''), coalesce("subject", ''));
