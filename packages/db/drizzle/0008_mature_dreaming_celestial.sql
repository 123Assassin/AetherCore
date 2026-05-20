CREATE TABLE "ai_model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"user_id" uuid,
	"agent_id" uuid,
	"engine_id" uuid,
	"model_name" varchar(100),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"latency_ms" integer,
	"cost_amount" numeric(12, 6),
	"currency" varchar(10),
	"status" varchar(20) NOT NULL,
	"error_code" varchar(100),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_model_calls_status_check" CHECK ("ai_model_calls"."status" in ('success', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_blacklisted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_model_calls" ADD CONSTRAINT "ai_model_calls_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_calls" ADD CONSTRAINT "ai_model_calls_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_calls" ADD CONSTRAINT "ai_model_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_calls" ADD CONSTRAINT "ai_model_calls_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_calls" ADD CONSTRAINT "ai_model_calls_engine_id_model_engines_id_fk" FOREIGN KEY ("engine_id") REFERENCES "public"."model_engines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_model_calls_engine_created" ON "ai_model_calls" USING btree ("engine_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_model_calls_user_created" ON "ai_model_calls" USING btree ("user_id","created_at" DESC NULLS LAST);