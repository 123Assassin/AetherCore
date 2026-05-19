import { sql } from 'drizzle-orm';
import {
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

import { users } from './users.js';

export const commentBatchJobStatuses = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type CommentBatchJobStatus = (typeof commentBatchJobStatuses)[number];

export const commentBatchRowStatuses = ['pending', 'generating', 'success', 'error'] as const;
export type CommentBatchRowStatus = (typeof commentBatchRowStatuses)[number];

export const commentBatchJobs = pgTable(
  'comment_batch_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 120 }),
    tone: varchar('tone', { length: 40 }).notNull().default('温和鼓励'),
    status: varchar('status', { length: 20 })
      .$type<CommentBatchJobStatus>()
      .notNull()
      .default('pending'),
    totalRows: integer('total_rows').notNull().default(0),
    successRows: integer('success_rows').notNull().default(0),
    failedRows: integer('failed_rows').notNull().default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_comment_batch_jobs_user_created').on(table.userId, table.createdAt.desc()),
    index('idx_comment_batch_jobs_status_updated').on(table.status, table.updatedAt.desc()),
    check(
      'comment_batch_jobs_status_check',
      sql`${table.status} in ('pending', 'running', 'completed', 'failed', 'cancelled')`
    ),
    check('comment_batch_jobs_file_size_check', sql`${table.fileSize} > 0`),
    check('comment_batch_jobs_total_rows_check', sql`${table.totalRows} >= 0`),
    check('comment_batch_jobs_success_rows_check', sql`${table.successRows} >= 0`),
    check('comment_batch_jobs_failed_rows_check', sql`${table.failedRows} >= 0`),
    check(
      'comment_batch_jobs_row_counts_check',
      sql`${table.successRows} + ${table.failedRows} <= ${table.totalRows}`
    ),
  ]
);

export const commentBatchRows = pgTable(
  'comment_batch_rows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => commentBatchJobs.id, { onDelete: 'cascade' }),
    rowIndex: integer('row_index').notNull(),
    nickname: varchar('nickname', { length: 100 }),
    gender: varchar('gender', { length: 2 }).$type<'男' | '女'>().notNull(),
    grade: varchar('grade', { length: 20 }).notNull(),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    keywords: text('keywords'),
    status: varchar('status', { length: 20 })
      .$type<CommentBatchRowStatus>()
      .notNull()
      .default('pending'),
    generatedResults: text('generated_results')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    generationMetadata: jsonb('generation_metadata').$type<Record<string, unknown> | null>(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_comment_batch_rows_job_index').on(table.jobId, table.rowIndex),
    index('idx_comment_batch_rows_job_status').on(table.jobId, table.status),
    check('comment_batch_rows_row_index_check', sql`${table.rowIndex} > 0`),
    check('comment_batch_rows_gender_check', sql`${table.gender} in ('男', '女')`),
    check(
      'comment_batch_rows_status_check',
      sql`${table.status} in ('pending', 'generating', 'success', 'error')`
    ),
  ]
);
