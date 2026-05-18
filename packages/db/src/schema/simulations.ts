import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const simulationCategories = pgTable('simulation_categories', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: varchar('parent_id', { length: 100 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const simulationApps = pgTable('simulation_apps', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  categoryId: varchar('category_id', { length: 100 })
    .notNull()
    .references(() => simulationCategories.id, { onDelete: 'cascade' }),
  src: text('src'),
  thumbnail: varchar('thumbnail', { length: 500 }),
  isable: boolean('isable').notNull().default(true),
  topics: jsonb('topics').$type<unknown[] | null>(),
  sampleLearningGoals: jsonb('sample_learning_goals').$type<unknown[] | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const grades = pgTable('grades', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 20 }).notNull().unique(),
});

export const gradeSimulationApps = pgTable(
  'grade_simulation_apps',
  {
    gradeId: integer('grade_id')
      .notNull()
      .references(() => grades.id, { onDelete: 'cascade' }),
    simulationAppId: varchar('simulation_app_id', { length: 100 })
      .notNull()
      .references(() => simulationApps.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.gradeId, table.simulationAppId] })]
);
