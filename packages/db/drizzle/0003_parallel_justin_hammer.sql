CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"metadata" jsonb,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_conversations_category_check" CHECK ("ai_conversations"."category" in ('chat', 'inspiration', 'comment', 'teaching'))
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"payload" jsonb,
	"suggestions" text[],
	"workflow_name" varchar(50),
	"redirect_to" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_messages_role_check" CHECK ("ai_messages"."role" in ('user', 'assistant', 'system'))
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_user_category_updated" ON "ai_conversations" USING btree ("user_id","category","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_audit" ON "ai_conversations" USING btree ("category","created_at" DESC NULLS LAST,"is_deleted");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation_created" ON "ai_messages" USING btree ("conversation_id","created_at");