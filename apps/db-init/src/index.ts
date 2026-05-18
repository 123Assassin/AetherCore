import { db } from '@package/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { seedAdmin } from './seed-admin.js';
import { seedData } from './seed-data.js';

async function main() {
  const seedOnly = process.argv.includes('--seed-only');

  try {
    if (!seedOnly) {
      console.log('Running migrations...');
      await migrate(db, { migrationsFolder: '../../packages/db/drizzle' });
      console.log('Migrations complete');
    }

    console.log('Seeding admin user...');
    await seedAdmin(db);

    console.log('Seeding default data...');
    await seedData(db);

    console.log('Database initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

void main();
