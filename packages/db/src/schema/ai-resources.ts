import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const modelEngineProviders = ['openai', 'gemini', 'custom'] as const;
export type ModelEngineProvider = (typeof modelEngineProviders)[number];

export const modelEngineCategories = ['reasoning', 'vision'] as const;
export type ModelEngineCategory = (typeof modelEngineCategories)[number];

export const aiResourceStatuses = ['enabled', 'disabled'] as const;
export type AiResourceStatus = (typeof aiResourceStatuses)[number];

export const aiAgentKeys = ['chat', 'inspiration', 'comment', 'teaching'] as const;
export type AiAgentKey = (typeof aiAgentKeys)[number];

export const modelEngines = pgTable(
  'model_engines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    provider: varchar('provider', { length: 50 }).$type<ModelEngineProvider>().notNull(),
    category: varchar('category', { length: 20 })
      .$type<ModelEngineCategory>()
      .notNull()
      .default('reasoning'),
    apiBaseUrl: text('api_base_url').notNull(),
    apiKeyCiphertext: text('api_key_ciphertext').notNull(),
    modelName: varchar('model_name', { length: 100 }),
    pricing: jsonb('pricing').$type<Record<string, unknown> | null>(),
    status: varchar('status', { length: 20 })
      .$type<AiResourceStatus>()
      .notNull()
      .default('enabled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('model_engines_provider_check', sql`${table.provider} in ('openai', 'gemini', 'custom')`),
    check('model_engines_category_check', sql`${table.category} in ('reasoning', 'vision')`),
    check('model_engines_status_check', sql`${table.status} in ('enabled', 'disabled')`),
  ]
);

export const aiPrompts = pgTable(
  'ai_prompts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 120 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    content: text('content').notNull(),
    createdByAdminId: uuid('created_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('uniq_prompt_title_version')
      .on(table.title, table.version)
      .where(sql`${table.deletedAt} is null`),
  ]
);

export const sensitiveWordLists = pgTable(
  'sensitive_word_lists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull().unique(),
    words: text('words').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('sensitive_word_lists_words_not_empty_check', sql`cardinality(${table.words}) > 0`),
  ]
);

export const aiAgents = pgTable(
  'ai_agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 50 }).$type<AiAgentKey>().notNull(),
    grade: varchar('grade', { length: 50 }),
    subject: varchar('subject', { length: 50 }),
    name: varchar('name', { length: 120 }).notNull(),
    engineId: uuid('engine_id')
      .notNull()
      .references(() => modelEngines.id),
    promptId: uuid('prompt_id').references(() => aiPrompts.id),
    sensitiveListId: uuid('sensitive_list_id').references(() => sensitiveWordLists.id),
    temperature: numeric('temperature', { precision: 3, scale: 2, mode: 'number' })
      .notNull()
      .default(0.7),
    topP: numeric('top_p', { precision: 3, scale: 2, mode: 'number' }).notNull().default(0.9),
    maxTokens: integer('max_tokens').notNull().default(2000),
    status: varchar('status', { length: 20 })
      .$type<AiResourceStatus>()
      .notNull()
      .default('enabled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check(
      'ai_agents_key_check',
      sql`${table.key} in ('chat', 'inspiration', 'comment', 'teaching')`
    ),
    check('ai_agents_status_check', sql`${table.status} in ('enabled', 'disabled')`),
    check(
      'ai_agents_temperature_check',
      sql`${table.temperature} >= 0 and ${table.temperature} <= 2`
    ),
    check('ai_agents_top_p_check', sql`${table.topP} >= 0 and ${table.topP} <= 1`),
    check('ai_agents_max_tokens_check', sql`${table.maxTokens} > 0`),
    index('idx_ai_agents_engine').on(table.engineId),
    index('idx_ai_agents_prompt').on(table.promptId),
    index('idx_ai_agents_sensitive_list').on(table.sensitiveListId),
    index('idx_ai_agents_key_grade_subject').on(table.key, table.grade, table.subject),
    uniqueIndex('uniq_ai_agents_key_grade_subject').on(
      table.key,
      sql`coalesce(${table.grade}, '')`,
      sql`coalesce(${table.subject}, '')`
    ),
  ]
);
