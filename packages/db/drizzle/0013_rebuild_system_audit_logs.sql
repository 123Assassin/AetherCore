DROP TABLE IF EXISTS "system_audit_logs";
--> statement-breakpoint
CREATE TABLE "system_audit_logs" (
  "log_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "timestamp" integer NOT NULL,
  "level" integer NOT NULL,
  "details" jsonb NOT NULL,
  "log_type" integer NOT NULL,
  CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY("log_id"),
  CONSTRAINT "system_audit_logs_timestamp_check" CHECK ("system_audit_logs"."timestamp" > 0),
  CONSTRAINT "system_audit_logs_level_check" CHECK ("system_audit_logs"."level" in (0, 1)),
  CONSTRAINT "system_audit_logs_log_type_check" CHECK ("system_audit_logs"."log_type" between 0 and 13)
);
--> statement-breakpoint
CREATE INDEX "idx_audit_timestamp" ON "system_audit_logs" USING btree ("timestamp" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_audit_log_type_timestamp" ON "system_audit_logs" USING btree ("log_type","timestamp" DESC NULLS LAST);
