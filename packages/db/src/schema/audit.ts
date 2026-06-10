import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { aiConversations, type ConversationCategory } from './ai-conversations.js';
import { users } from './users.js';

export type SystemAuditLogDetails = Record<string, unknown>;
export type SystemAuditLogLevel = 0 | 1;
export type SystemAuditLogType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export const systemAuditLogs = pgTable(
  'system_audit_logs',
  {
    logId: uuid('log_id').defaultRandom().primaryKey(),
    timestamp: integer('timestamp').notNull(),
    level: integer('level').$type<SystemAuditLogLevel>().notNull(),
    details: jsonb('details').$type<SystemAuditLogDetails>().notNull(),
    logType: integer('log_type').$type<SystemAuditLogType>().notNull(),
  },
  (table) => [
    index('idx_audit_timestamp').on(table.timestamp.desc()),
    index('idx_audit_log_type_timestamp').on(table.logType, table.timestamp.desc()),
    check('system_audit_logs_timestamp_check', sql`${table.timestamp} > 0`),
    check('system_audit_logs_level_check', sql`${table.level} in (0, 1)`),
    check('system_audit_logs_log_type_check', sql`${table.logType} between 0 and 13`),
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
