CREATE TABLE "comment_batch_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(120),
	"tone" varchar(40) DEFAULT '温和鼓励' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_batch_jobs_status_check" CHECK ("comment_batch_jobs"."status" in ('pending', 'running', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "comment_batch_jobs_file_size_check" CHECK ("comment_batch_jobs"."file_size" > 0),
	CONSTRAINT "comment_batch_jobs_total_rows_check" CHECK ("comment_batch_jobs"."total_rows" >= 0),
	CONSTRAINT "comment_batch_jobs_success_rows_check" CHECK ("comment_batch_jobs"."success_rows" >= 0),
	CONSTRAINT "comment_batch_jobs_failed_rows_check" CHECK ("comment_batch_jobs"."failed_rows" >= 0),
	CONSTRAINT "comment_batch_jobs_row_counts_check" CHECK ("comment_batch_jobs"."success_rows" + "comment_batch_jobs"."failed_rows" <= "comment_batch_jobs"."total_rows")
);
--> statement-breakpoint
CREATE TABLE "comment_batch_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"row_index" integer NOT NULL,
	"nickname" varchar(100),
	"gender" varchar(2) NOT NULL,
	"grade" varchar(20) NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"keywords" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"generated_results" text[] DEFAULT '{}'::text[] NOT NULL,
	"generation_metadata" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_batch_rows_row_index_check" CHECK ("comment_batch_rows"."row_index" > 0),
	CONSTRAINT "comment_batch_rows_gender_check" CHECK ("comment_batch_rows"."gender" in ('男', '女')),
	CONSTRAINT "comment_batch_rows_status_check" CHECK ("comment_batch_rows"."status" in ('pending', 'generating', 'success', 'error'))
);
--> statement-breakpoint
ALTER TABLE "comment_batch_jobs" ADD CONSTRAINT "comment_batch_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_batch_rows" ADD CONSTRAINT "comment_batch_rows_job_id_comment_batch_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."comment_batch_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comment_batch_jobs_user_created" ON "comment_batch_jobs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_comment_batch_jobs_status_updated" ON "comment_batch_jobs" USING btree ("status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_comment_batch_rows_job_index" ON "comment_batch_rows" USING btree ("job_id","row_index");--> statement-breakpoint
CREATE INDEX "idx_comment_batch_rows_job_status" ON "comment_batch_rows" USING btree ("job_id","status");