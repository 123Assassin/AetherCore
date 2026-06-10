import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const activityStatuses = ['draft', 'published'] as const;
export type ActivityStatus = (typeof activityStatuses)[number];

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull(),
    status: varchar('status', { length: 20 }).$type<ActivityStatus>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdByAdminId: uuid('created_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_activities_status_published').on(table.status, table.publishedAt.desc()),
    index('idx_activities_created').on(table.createdAt.desc()),
    check('activities_status_check', sql`${table.status} in ('draft', 'published')`),
  ]
);

export const inviteCodes = pgTable(
  'invite_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    code: varchar('code', { length: 32 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_invite_codes_user').on(table.userId)]
);

export const inviteRelations = pgTable(
  'invite_relations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inviterUserId: uuid('inviter_user_id')
      .notNull()
      .references(() => users.id),
    inviteeUserId: uuid('invitee_user_id')
      .notNull()
      .references(() => users.id),
    inviteCodeId: uuid('invite_code_id').references(() => inviteCodes.id),
    tier: integer('tier').notNull().default(1),
    rewardGranted: boolean('reward_granted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_invitee').on(table.inviteeUserId),
    index('idx_invite_relations_inviter_created').on(table.inviterUserId, table.createdAt.desc()),
    index('idx_invite_relations_invite_code').on(table.inviteCodeId),
    check('invite_relations_tier_check', sql`${table.tier} > 0`),
    check(
      'invite_relations_distinct_users_check',
      sql`${table.inviterUserId} <> ${table.inviteeUserId}`
    ),
  ]
);

export const fissionRewardConfig = pgTable(
  'fission_reward_config',
  {
    id: varchar('id', { length: 20 }).notNull().default('default').primaryKey(),
    inviterQuota: integer('inviter_quota').notNull(),
    inviteeQuota: integer('invitee_quota').notNull(),
    enableMultiTier: boolean('enable_multi_tier').notNull(),
    tier2RewardPct: integer('tier2_reward_pct').notNull(),
    isActive: boolean('is_active').notNull(),
    updatedByAdminId: uuid('updated_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('fission_reward_config_singleton_check', sql`${table.id} = 'default'`),
    check('fission_reward_config_inviter_quota_check', sql`${table.inviterQuota} >= 0`),
    check('fission_reward_config_invitee_quota_check', sql`${table.inviteeQuota} >= 0`),
    check(
      'fission_reward_config_tier2_reward_pct_check',
      sql`${table.tier2RewardPct} >= 0 and ${table.tier2RewardPct} <= 100`
    ),
  ]
);

export const alarmConfig = pgTable(
  'alarm_config',
  {
    id: varchar('id', { length: 20 }).notNull().default('default').primaryKey(),
    costThresholdAmount: numeric('cost_threshold_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('CNY'),
    email: varchar('email', { length: 255 }).notNull(),
    updatedByAdminId: uuid('updated_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('alarm_config_singleton_check', sql`${table.id} = 'default'`),
    check('alarm_config_cost_threshold_amount_check', sql`${table.costThresholdAmount} >= 0`),
  ]
);

export const systemAuthConfig = pgTable(
  'system_auth_config',
  {
    id: varchar('id', { length: 20 }).notNull().default('default').primaryKey(),
    adminIdleTimeoutMinutes: integer('admin_idle_timeout_minutes').notNull(),
    auditLogRetentionDays: integer('audit_log_retention_days').notNull().default(180),
    webIdleTimeoutMinutes: integer('web_idle_timeout_minutes').notNull(),
    updatedByAdminId: uuid('updated_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('system_auth_config_singleton_check', sql`${table.id} = 'default'`),
    check('system_auth_config_admin_idle_timeout_check', sql`${table.adminIdleTimeoutMinutes} > 0`),
    check('system_auth_config_audit_log_retention_check', sql`${table.auditLogRetentionDays} > 0`),
    check('system_auth_config_web_idle_timeout_check', sql`${table.webIdleTimeoutMinutes} > 0`),
  ]
);
