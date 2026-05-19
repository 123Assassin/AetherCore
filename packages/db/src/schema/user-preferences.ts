import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  grade: varchar('grade', { length: 50 }),
  subject: varchar('subject', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
