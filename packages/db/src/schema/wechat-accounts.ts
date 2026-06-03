import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const wechatAccounts = pgTable(
  'wechat_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    openid: varchar('openid', { length: 128 }).notNull(),
    unionid: varchar('unionid', { length: 128 }),
    nickname: varchar('nickname', { length: 100 }),
    avatarUrl: text('avatar_url'),
    rawProfile: jsonb('raw_profile').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_wechat_openid').on(table.openid),
    uniqueIndex('uniq_wechat_unionid')
      .on(table.unionid)
      .where(sql`${table.unionid} is not null`),
    index('idx_wechat_user_id').on(table.userId),
  ]
);
