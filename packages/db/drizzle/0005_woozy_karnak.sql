DROP INDEX "idx_ai_messages_conversation_created";--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "message_order" bigserial NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation_order" ON "ai_messages" USING btree ("conversation_id","message_order");