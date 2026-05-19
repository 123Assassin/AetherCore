import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const conversationCategories = ['chat', 'inspiration', 'comment', 'teaching'] as const;
export type ConversationCategory = (typeof conversationCategories)[number];

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 20 }).$type<ConversationCategory>().notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ai_conversations_user_category_updated').on(
      table.userId,
      table.category,
      table.updatedAt.desc()
    ),
    index('idx_ai_conversations_audit').on(table.category, table.createdAt.desc(), table.isDeleted),
    check(
      'ai_conversations_category_check',
      sql`${table.category} in ('chat', 'inspiration', 'comment', 'teaching')`
    ),
  ]
);
