import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { aiConversations } from './ai-conversations.js';
import { aiMessages } from './ai-messages.js';
import { aiAgents, modelEngines } from './ai-resources.js';
import { users } from './users.js';

export const aiModelCallStatuses = ['success', 'failed'] as const;
export type AiModelCallStatus = (typeof aiModelCallStatuses)[number];

export const aiModelCalls = pgTable(
  'ai_model_calls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').references(() => aiConversations.id, {
      onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => aiMessages.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    agentId: uuid('agent_id').references(() => aiAgents.id, { onDelete: 'set null' }),
    engineId: uuid('engine_id').references(() => modelEngines.id, { onDelete: 'set null' }),
    modelName: varchar('model_name', { length: 100 }),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    latencyMs: integer('latency_ms'),
    costAmount: numeric('cost_amount', { precision: 12, scale: 6, mode: 'number' }),
    currency: varchar('currency', { length: 10 }),
    status: varchar('status', { length: 20 }).$type<AiModelCallStatus>().notNull(),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ai_model_calls_engine_created').on(table.engineId, table.createdAt.desc()),
    index('idx_ai_model_calls_user_created').on(table.userId, table.createdAt.desc()),
    check('ai_model_calls_status_check', sql`${table.status} in ('success', 'failed')`),
  ]
);
