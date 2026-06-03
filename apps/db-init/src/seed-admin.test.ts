import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { Database } from '@package/db';

import {
  getAdminSeedConfig,
  getWebUserSeedConfig,
  getWebUserSeedConfigs,
  seedAdmin,
  seedWebUser,
} from './seed-admin.js';

afterEach(() => {
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_USER;
  delete process.env.WEB_USER;
  delete process.env.WEB_USER_EMAIL;
  delete process.env.WEB_USER_PASSWORD;
});

describe('getAdminSeedConfig', () => {
  it('uses username-based default admin credentials', () => {
    assert.deepEqual(getAdminSeedConfig(), {
      email: 'admin@aethercore.local',
      user: 'admin',
      password: 'admin@123',
    });
  });

  it('allows environment variables to override the defaults', () => {
    process.env.ADMIN_USER = 'root';
    process.env.ADMIN_EMAIL = 'root@example.com';
    process.env.ADMIN_PASSWORD = 'secret';

    assert.deepEqual(getAdminSeedConfig(), {
      email: 'root@example.com',
      user: 'root',
      password: 'secret',
    });
  });
});

describe('getWebUserSeedConfig', () => {
  it('uses username-based default web user credentials', () => {
    assert.deepEqual(getWebUserSeedConfig(), {
      email: 'teacher@aethercore.local',
      password: 'teacher123',
      user: 'teacher',
    });
  });

  it('allows web user environment variables to override the defaults', () => {
    process.env.WEB_USER = 'demo';
    process.env.WEB_USER_EMAIL = 'demo@example.com';
    process.env.WEB_USER_PASSWORD = 'demo-secret';

    assert.deepEqual(getWebUserSeedConfig(), {
      email: 'demo@example.com',
      password: 'demo-secret',
      user: 'demo',
    });
  });
});

describe('getWebUserSeedConfigs', () => {
  it('returns 20 built-in web user accounts', () => {
    const configs = getWebUserSeedConfigs();

    assert.equal(configs.length, 20);
    assert.deepEqual(
      configs.map((item) => item.user),
      [
        'teacher',
        'teacher01',
        'teacher02',
        'teacher03',
        'teacher04',
        'teacher05',
        'teacher06',
        'teacher07',
        'teacher08',
        'teacher09',
        'teacher10',
        'teacher11',
        'teacher12',
        'teacher13',
        'teacher14',
        'teacher15',
        'teacher16',
        'teacher17',
        'teacher18',
        'teacher19',
      ]
    );
    assert.ok(configs.every((item) => item.password === 'teacher123'));
  });

  it('keeps environment overrides on the primary web user account', () => {
    process.env.WEB_USER = 'demo';
    process.env.WEB_USER_EMAIL = 'demo@example.com';
    process.env.WEB_USER_PASSWORD = 'demo-secret';

    const configs = getWebUserSeedConfigs();

    assert.equal(configs.length, 20);
    assert.deepEqual(configs[0], {
      email: 'demo@example.com',
      password: 'demo-secret',
      user: 'demo',
    });
    assert.equal(configs[1]?.user, 'teacher01');
    assert.ok(configs.every((item) => item.password === 'demo-secret'));
  });
});

describe('seedAdmin', () => {
  it('inserts a username-backed admin account', async () => {
    const db = new FakeSeedDb([[], []]);

    await seedAdmin(db.asDatabase());

    assert.equal(db.insertedUser?.username, 'admin');
    assert.equal(db.insertedUser?.email, 'admin@aethercore.local');
    assert.equal(db.insertedUser?.role, 'admin');
  });

  it('backfills a legacy email-backed admin account with the admin username', async () => {
    const db = new FakeSeedDb([[], [{ id: 'legacy-admin', role: 'admin', username: null }]]);

    await seedAdmin(db.asDatabase());

    assert.equal(db.insertedUser, undefined);
    assert.equal(db.updatedUser?.username, 'admin');
    assert.ok(db.updatedUser?.updatedAt instanceof Date);
  });

  it('replaces the default migration username when ADMIN_USER is customized', async () => {
    process.env.ADMIN_USER = 'root';
    process.env.ADMIN_EMAIL = 'admin@aethercore.local';
    const db = new FakeSeedDb([[], [{ id: 'legacy-admin', role: 'admin', username: 'admin' }]]);

    await seedAdmin(db.asDatabase());

    assert.equal(db.insertedUser, undefined);
    assert.equal(db.updatedUser?.username, 'root');
  });
});

describe('seedWebUser', () => {
  it('inserts 20 username-backed normal web user accounts', async () => {
    const db = new FakeSeedDb(Array.from({ length: 40 }, () => []));

    await seedWebUser(db.asDatabase());

    assert.equal(db.insertedUsers.length, 20);
    assert.equal(db.insertedUsers[0]?.username, 'teacher');
    assert.equal(db.insertedUsers[0]?.email, 'teacher@aethercore.local');
    assert.equal(db.insertedUsers[0]?.role, 'user');
    assert.equal(db.insertedUsers[19]?.username, 'teacher19');
    assert.equal(db.insertedUsers[19]?.email, 'teacher19@aethercore.local');
  });

  it('does not update existing web users', async () => {
    const existingRows = getWebUserSeedConfigs().map((item) => [
      { id: `${item.user}-user`, role: 'user', username: item.user },
    ]);
    const db = new FakeSeedDb(existingRows);

    await seedWebUser(db.asDatabase());

    assert.deepEqual(db.insertedUsers, []);
    assert.deepEqual(db.updatedUsers, []);
  });
});

type SeedSelectRow = {
  id: string;
  role: string;
  username: string | null;
};

type SeedInsertValues = {
  email?: string;
  password?: string;
  role?: string;
  username?: string | null;
};

type SeedUpdateValues = {
  updatedAt?: Date;
  username?: string | null;
};

class FakeSeedDb {
  insertedUser: SeedInsertValues | undefined;
  insertedUsers: SeedInsertValues[] = [];
  updatedUser: SeedUpdateValues | undefined;
  updatedUsers: SeedUpdateValues[] = [];

  constructor(private readonly selectResults: SeedSelectRow[][]) {}

  asDatabase(): Database {
    return this as unknown as Database;
  }

  select() {
    const rows = this.selectResults.shift() ?? [];

    return {
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    };
  }

  insert() {
    return {
      values: async (values: SeedInsertValues) => {
        this.insertedUser = values;
        this.insertedUsers.push(values);
      },
    };
  }

  update() {
    return {
      set: (values: SeedUpdateValues) => {
        this.updatedUser = values;
        this.updatedUsers.push(values);

        return {
          where: async () => undefined,
        };
      },
    };
  }
}
