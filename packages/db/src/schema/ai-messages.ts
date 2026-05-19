import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { aiConversations } from './ai-conversations.js';

export const messageRoles = ['user', 'assistant', 'system'] as const;
export type MessageRole = (typeof messageRoles)[number];

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).$type<MessageRole>().notNull(),
    content: text('content').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown> | unknown[] | null>(),
    suggestions: text('suggestions').array(),
    workflowName: varchar('workflow_name', { length: 50 }),
    redirectTo: varchar('redirect_to', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ai_messages_conversation_created').on(table.conversationId, table.createdAt),
    check('ai_messages_role_check', sql`${table.role} in ('user', 'assistant', 'system')`),
  ]
);
