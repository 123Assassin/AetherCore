import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const creditDirections = ['in', 'out'] as const;
export type CreditDirection = (typeof creditDirections)[number];

export const creditReasons = [
  'chat',
  'inspiration',
  'comment_single',
  'comment_batch_row',
  'teaching',
  'invite_reward',
  'admin_adjust',
  'refund',
] as const;
export type CreditReason = (typeof creditReasons)[number];

export const userCreditAccounts = pgTable(
  'user_credit_accounts',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
    cycleLimit: integer('cycle_limit').notNull().default(100),
    cycleDays: integer('cycle_days').notNull().default(180),
    resetAt: timestamp('reset_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('user_credit_accounts_balance_check', sql`${table.balance} >= 0`),
    check('user_credit_accounts_cycle_limit_check', sql`${table.cycleLimit} >= 0`),
    check('user_credit_accounts_cycle_days_check', sql`${table.cycleDays} > 0`),
  ]
);

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    direction: varchar('direction', { length: 3 }).$type<CreditDirection>().notNull(),
    amount: integer('amount').notNull(),
    reason: varchar('reason', { length: 32 }).$type<CreditReason>().notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    relatedType: varchar('related_type', { length: 64 }),
    relatedId: uuid('related_id'),
    balanceAfter: integer('balance_after').notNull(),
    createdByAdminId: uuid('created_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_credit_idempotency')
      .on(table.userId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    index('idx_credit_user_created').on(table.userId, table.createdAt.desc()),
    check('credit_transactions_direction_check', sql`${table.direction} in ('in', 'out')`),
    check(
      'credit_transactions_reason_check',
      sql`${table.reason} in ('chat', 'inspiration', 'comment_single', 'comment_batch_row', 'teaching', 'invite_reward', 'admin_adjust', 'refund')`
    ),
    check('credit_transactions_amount_check', sql`${table.amount} > 0`),
    check('credit_transactions_balance_after_check', sql`${table.balanceAfter} >= 0`),
  ]
);
