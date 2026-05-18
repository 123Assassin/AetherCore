import { access } from 'node:fs/promises';
import { join } from 'node:path';

export const requireEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const resolveMigrationsFolder = async (cwd = process.cwd()) => {
  if (process.env.MIGRATIONS_FOLDER) {
    return process.env.MIGRATIONS_FOLDER;
  }

  const containerFolder = join(cwd, 'drizzle');

  try {
    await access(containerFolder);
    return containerFolder;
  } catch {
    return join(cwd, '../../packages/db/drizzle');
  }
};
