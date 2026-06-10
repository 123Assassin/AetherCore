CREATE TABLE "system_auth_config" (
  "id" varchar(20) DEFAULT 'default' NOT NULL,
  "admin_idle_timeout_minutes" integer NOT NULL,
  "web_idle_timeout_minutes" integer NOT NULL,
  "updated_by_admin_id" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "system_auth_config_pkey" PRIMARY KEY("id"),
  CONSTRAINT "system_auth_config_singleton_check" CHECK ("system_auth_config"."id" = 'default'),
  CONSTRAINT "system_auth_config_admin_idle_timeout_check" CHECK ("system_auth_config"."admin_idle_timeout_minutes" > 0),
  CONSTRAINT "system_auth_config_web_idle_timeout_check" CHECK ("system_auth_config"."web_idle_timeout_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "system_auth_config" ADD CONSTRAINT "system_auth_config_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
