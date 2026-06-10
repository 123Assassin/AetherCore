ALTER TABLE "system_auth_config" ADD COLUMN "audit_log_retention_days" integer DEFAULT 180 NOT NULL;
--> statement-breakpoint
ALTER TABLE "system_auth_config" ADD CONSTRAINT "system_auth_config_audit_log_retention_check" CHECK ("system_auth_config"."audit_log_retention_days" > 0);
