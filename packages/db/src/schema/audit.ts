import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { aiConversations, type ConversationCategory } from './ai-conversations.js';
import { users } from './users.js';

export const auditActorTypes = ['admin', 'user', 'system'] as const;
export type AuditActorType = (typeof auditActorTypes)[number];

export const systemAuditLogs = pgTable(
  'system_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorType: varchar('actor_type', { length: 20 }).$type<AuditActorType>().notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }),
    resourceId: uuid('resource_id'),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_created').on(table.createdAt.desc()),
    index('idx_audit_actor').on(table.actorType, table.actorId, table.createdAt.desc()),
    check(
      'system_audit_logs_actor_type_check',
      sql`${table.actorType} in ('admin', 'user', 'system')`
    ),
  ]
);

export const contentAuditSessions = pgTable(
  'content_audit_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aiConversations.id),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    userEmail: varchar('user_email', { length: 255 }).notNull(),
    category: varchar('category', { length: 20 }).$type<ConversationCategory>().notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    messageCount: integer('message_count').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_content_audit_sessions_conversation').on(table.conversationId),
    index('idx_content_audit_sessions_user_updated').on(table.userId, table.updatedAt.desc()),
    index('idx_content_audit_sessions_category_updated').on(table.category, table.updatedAt.desc()),
    index('idx_content_audit_sessions_deleted_updated').on(table.isDeleted, table.updatedAt.desc()),
    check(
      'content_audit_sessions_category_check',
      sql`${table.category} in ('chat', 'inspiration', 'comment', 'teaching')`
    ),
    check('content_audit_sessions_message_count_check', sql`${table.messageCount} >= 0`),
  ]
);
