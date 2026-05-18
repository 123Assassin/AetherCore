import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { getAdminSeedConfig } from './seed-admin.js';

afterEach(() => {
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD;
});

describe('getAdminSeedConfig', () => {
  it('uses the legacy db-init default admin credentials', () => {
    assert.deepEqual(getAdminSeedConfig(), {
      email: 'admin',
      password: 'admin@123',
    });
  });

  it('allows environment variables to override the defaults', () => {
    process.env.ADMIN_EMAIL = 'root@example.com';
    process.env.ADMIN_PASSWORD = 'secret';

    assert.deepEqual(getAdminSeedConfig(), {
      email: 'root@example.com',
      password: 'secret',
    });
  });
});
