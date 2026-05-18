import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { db } from './client.js';

export const runMigrations = async (migrationsFolder = './drizzle') => {
  await migrate(db, { migrationsFolder });
};
