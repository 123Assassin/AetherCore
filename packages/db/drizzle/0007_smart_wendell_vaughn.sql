CREATE TABLE "content_audit_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid,
	"user_email" varchar(255) NOT NULL,
	"category" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone,
	"metadata" jsonb,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_audit_sessions_category_check" CHECK ("content_audit_sessions"."category" in ('chat', 'inspiration', 'comment', 'teaching')),
	CONSTRAINT "content_audit_sessions_message_count_check" CHECK ("content_audit_sessions"."message_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "system_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" uuid,
	"ip" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_audit_logs_actor_type_check" CHECK ("system_audit_logs"."actor_type" in ('admin', 'user', 'system'))
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "activities_status_check" CHECK ("activities"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "alarm_config" (
	"id" varchar(20) PRIMARY KEY DEFAULT 'default' NOT NULL,
	"cost_threshold_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CNY' NOT NULL,
	"email" varchar(255) NOT NULL,
	"updated_by_admin_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alarm_config_singleton_check" CHECK ("alarm_config"."id" = 'default'),
	CONSTRAINT "alarm_config_cost_threshold_amount_check" CHECK ("alarm_config"."cost_threshold_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fission_reward_config" (
	"id" varchar(20) PRIMARY KEY DEFAULT 'default' NOT NULL,
	"inviter_quota" integer NOT NULL,
	"invitee_quota" integer NOT NULL,
	"enable_multi_tier" boolean NOT NULL,
	"tier2_reward_pct" integer NOT NULL,
	"is_active" boolean NOT NULL,
	"updated_by_admin_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fission_reward_config_singleton_check" CHECK ("fission_reward_config"."id" = 'default'),
	CONSTRAINT "fission_reward_config_inviter_quota_check" CHECK ("fission_reward_config"."inviter_quota" >= 0),
	CONSTRAINT "fission_reward_config_invitee_quota_check" CHECK ("fission_reward_config"."invitee_quota" >= 0),
	CONSTRAINT "fission_reward_config_tier2_reward_pct_check" CHECK ("fission_reward_config"."tier2_reward_pct" >= 0 and "fission_reward_config"."tier2_reward_pct" <= 100)
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "invite_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"invitee_user_id" uuid NOT NULL,
	"invite_code_id" uuid,
	"tier" integer DEFAULT 1 NOT NULL,
	"reward_granted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_relations_tier_check" CHECK ("invite_relations"."tier" > 0),
	CONSTRAINT "invite_relations_distinct_users_check" CHECK ("invite_relations"."inviter_user_id" <> "invite_relations"."invitee_user_id")
);
--> statement-breakpoint
ALTER TABLE "content_audit_sessions" ADD CONSTRAINT "content_audit_sessions_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_audit_sessions" ADD CONSTRAINT "content_audit_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alarm_config" ADD CONSTRAINT "alarm_config_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fission_reward_config" ADD CONSTRAINT "fission_reward_config_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_relations" ADD CONSTRAINT "invite_relations_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_relations" ADD CONSTRAINT "invite_relations_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_relations" ADD CONSTRAINT "invite_relations_invite_code_id_invite_codes_id_fk" FOREIGN KEY ("invite_code_id") REFERENCES "public"."invite_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_content_audit_sessions_conversation" ON "content_audit_sessions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_content_audit_sessions_user_updated" ON "content_audit_sessions" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_content_audit_sessions_category_updated" ON "content_audit_sessions" USING btree ("category","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_content_audit_sessions_deleted_updated" ON "content_audit_sessions" USING btree ("is_deleted","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "system_audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "system_audit_logs" USING btree ("actor_type","actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activities_status_published" ON "activities" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activities_created" ON "activities" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_invite_codes_user" ON "invite_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_invitee" ON "invite_relations" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "idx_invite_relations_inviter_created" ON "invite_relations" USING btree ("inviter_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_invite_relations_invite_code" ON "invite_relations" USING btree ("invite_code_id");