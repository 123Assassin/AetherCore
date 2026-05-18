import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveMigrationsFolder } from './utils.js';

let tempDir: string | undefined;

afterEach(async () => {
  delete process.env.MIGRATIONS_FOLDER;

  if (tempDir) {
    await rm(tempDir, { force: true, recursive: true });
    tempDir = undefined;
  }
});

describe('resolveMigrationsFolder', () => {
  it('uses MIGRATIONS_FOLDER when it is set', async () => {
    process.env.MIGRATIONS_FOLDER = '/custom/drizzle';

    assert.equal(await resolveMigrationsFolder(), '/custom/drizzle');
  });

  it('uses ./drizzle when running from a built container layout', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'db-init-'));
    await mkdir(join(tempDir, 'drizzle'));

    assert.equal(await resolveMigrationsFolder(tempDir), join(tempDir, 'drizzle'));
  });

  it('falls back to the monorepo packages/db migration folder', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'db-init-'));

    assert.equal(
      await resolveMigrationsFolder(tempDir),
      join(tempDir, '../../packages/db/drizzle')
    );
  });
});
