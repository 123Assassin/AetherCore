CREATE TABLE "ai_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"engine_id" uuid NOT NULL,
	"prompt_id" uuid,
	"sensitive_list_id" uuid,
	"temperature" numeric(3, 2) DEFAULT 0.7 NOT NULL,
	"top_p" numeric(3, 2) DEFAULT 0.9 NOT NULL,
	"max_tokens" integer DEFAULT 2000 NOT NULL,
	"status" varchar(20) DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "ai_agents_key_unique" UNIQUE("key"),
	CONSTRAINT "ai_agents_key_check" CHECK ("ai_agents"."key" in ('chat', 'inspiration', 'comment', 'teaching')),
	CONSTRAINT "ai_agents_status_check" CHECK ("ai_agents"."status" in ('enabled', 'disabled')),
	CONSTRAINT "ai_agents_temperature_check" CHECK ("ai_agents"."temperature" >= 0 and "ai_agents"."temperature" <= 2),
	CONSTRAINT "ai_agents_top_p_check" CHECK ("ai_agents"."top_p" >= 0 and "ai_agents"."top_p" <= 1),
	CONSTRAINT "ai_agents_max_tokens_check" CHECK ("ai_agents"."max_tokens" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"version" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "model_engines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"api_base_url" text NOT NULL,
	"api_key_ciphertext" text NOT NULL,
	"model_name" varchar(100),
	"pricing" jsonb,
	"status" varchar(20) DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "model_engines_name_unique" UNIQUE("name"),
	CONSTRAINT "model_engines_provider_check" CHECK ("model_engines"."provider" in ('openai', 'gemini', 'custom')),
	CONSTRAINT "model_engines_status_check" CHECK ("model_engines"."status" in ('enabled', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "sensitive_word_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"words" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sensitive_word_lists_name_unique" UNIQUE("name"),
	CONSTRAINT "sensitive_word_lists_words_not_empty_check" CHECK (cardinality("sensitive_word_lists"."words") > 0)
);
--> statement-breakpoint
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_engine_id_model_engines_id_fk" FOREIGN KEY ("engine_id") REFERENCES "public"."model_engines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_prompt_id_ai_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."ai_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_sensitive_list_id_sensitive_word_lists_id_fk" FOREIGN KEY ("sensitive_list_id") REFERENCES "public"."sensitive_word_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_agents_engine" ON "ai_agents" USING btree ("engine_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agents_prompt" ON "ai_agents" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agents_sensitive_list" ON "ai_agents" USING btree ("sensitive_list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_prompt_title_version" ON "ai_prompts" USING btree ("title","version") WHERE "ai_prompts"."deleted_at" is null;