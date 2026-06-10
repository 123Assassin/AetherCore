import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AdminAuditRepository } from './admin-audit.repository.js';
import { AdminAuditService, type AdminAuditLogSaveData } from './admin-audit.service.js';

test('records admin query requests as info logs with request details', async () => {
  const repository = new FakeAdminAuditRepository();
  const service = new AdminAuditService(repository.asRepository());

  await withNow(new Date('2026-05-20T00:00:00.000Z'), async () => {
    await service.recordAdminApiRequest({
      actorAccount: 'admin@example.com',
      actorId: 'admin-1',
      input: { role: 'user' },
      ip: '127.0.0.1',
      path: 'adminOperations.users.list',
      result: { data: { total: 0 }, success: true },
      type: 'query',
      userAgent: 'node-test',
    });
  });

  assert.equal(repository.logs[0]?.level, 1);
  assert.equal(repository.logs[0]?.logType, 1);
  assert.equal(repository.logs[0]?.timestamp, 1779235200);
  assert.deepEqual(repository.logs[0]?.details, {
    actorId: 'admin-1',
    actorAccount: 'admin@example.com',
    apiRoute: 'adminOperations.users.list',
    module: '用户管理',
    requestParams: { role: 'user' },
    requestResult: { data: { total: 0 }, success: true },
    requestType: 'query',
    ip: '127.0.0.1',
    userAgent: 'node-test',
  });
});

test('records admin mutation requests as warning logs and redacts sensitive input', async () => {
  const repository = new FakeAdminAuditRepository();
  const service = new AdminAuditService(repository.asRepository());

  await service.recordAdminApiRequest({
    actorAccount: 'admin@example.com',
    actorId: 'admin-1',
    input: { currentPassword: 'old-password', newPassword: 'new-password' },
    ip: null,
    path: 'adminAuth.changePassword',
    result: {
      error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect' },
      success: false,
    },
    type: 'mutation',
    userAgent: null,
  });

  assert.equal(repository.logs[0]?.level, 0);
  assert.equal(repository.logs[0]?.logType, 2);
  assert.deepEqual(repository.logs[0]?.details.requestParams, {
    currentPassword: '[REDACTED]',
    newPassword: '[REDACTED]',
  });
  assert.deepEqual(repository.logs[0]?.details.requestResult, {
    error: {
      code: 'UNAUTHORIZED',
      message: 'Current password is incorrect',
    },
    success: false,
  });
});

test('maps system administrator user responses to system administrator management logs', async () => {
  const repository = new FakeAdminAuditRepository();
  const service = new AdminAuditService(repository.asRepository());

  await service.recordAdminApiRequest({
    actorAccount: 'admin@example.com',
    actorId: 'admin-1',
    input: { id: 'admin-user-id' },
    ip: null,
    path: 'adminOperations.users.delete',
    result: { data: { role: 'admin' }, success: true },
    type: 'mutation',
    userAgent: null,
  });

  assert.equal(repository.logs[0]?.logType, 0);
  assert.equal(repository.logs[0]?.details.module, '系统管理员管理');
});

test('maps full admin resources paths to their resource log types', async () => {
  const repository = new FakeAdminAuditRepository();
  const service = new AdminAuditService(repository.asRepository());

  await service.recordAdminApiRequest({
    actorAccount: 'admin@example.com',
    actorId: 'admin-1',
    input: { q: 'assistant' },
    ip: null,
    path: 'adminResources.agents.list',
    result: { data: [], success: true },
    type: 'query',
    userAgent: null,
  });

  assert.equal(repository.logs[0]?.logType, 3);
  assert.equal(repository.logs[0]?.details.module, '智能体管理');
});

class FakeAdminAuditRepository {
  readonly logs: AdminAuditLogSaveData[] = [];

  asRepository(): AdminAuditRepository {
    return this as unknown as AdminAuditRepository;
  }

  async createSystemAuditLog(input: AdminAuditLogSaveData): Promise<void> {
    this.logs.push(input);
  }
}

async function withNow(date: Date, callback: () => Promise<void>): Promise<void> {
  const originalDateNow = Date.now;

  Date.now = () => date.getTime();

  try {
    await callback();
  } finally {
    Date.now = originalDateNow;
  }
}
