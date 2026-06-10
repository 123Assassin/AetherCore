import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { initTRPC, type TRPCDefaultErrorShape } from '@trpc/server';

import type { AuthService } from '../../modules/auth/auth.service.js';
import type {
  AdminAuditRequestInput,
  AdminAuditService,
} from '../../modules/admin-audit/admin-audit.service.js';
import {
  AdminOperationsServiceError,
  type AdminOperationsService,
} from '../../modules/admin-operations/admin-operations.service.js';
import type { TRPCContext } from '../context.js';
import { formatTRPCErrorShape } from '../router.js';
import { createAdminOperationsRouter } from './admin-operations.router.js';

const t = initTRPC.context<TRPCContext>().create();
const createTRPCRouter = t.router;
const publicProcedure = t.procedure;

test('adminOperations users status requires an admin session', async () => {
  const authService = new FakeAuthService(false).asAuthService();
  const service = new FakeAdminOperationsService(null).asService();
  const caller = createCaller(authService, service);

  await assert.rejects(
    () => caller.users.status({ id: 'user-1', status: 'disabled' }),
    trpcError('UNAUTHORIZED', 'Admin session required')
  );
});

test('adminOperations users status checks admin session before validating malformed input', async () => {
  const authService = new FakeAuthService(false).asAuthService();
  const service = new FakeAdminOperationsService(null).asService();
  const caller = createCaller(authService, service);

  await assert.rejects(
    () => caller.users.status({} as never),
    trpcError('UNAUTHORIZED', 'Admin session required')
  );
});

test('adminOperations content audit delete maps service conflicts to tRPC conflicts', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const service = new FakeAdminOperationsService(
    new AdminOperationsServiceError(
      'CONFLICT',
      'Content audit session already deleted',
      'RESOURCE_ALREADY_DELETED'
    )
  ).asService();
  const caller = createCaller(authService, service);

  await assert.rejects(
    () => caller.contentAudit.delete({ id: 'content-1' }),
    trpcError('CONFLICT', 'Content audit session already deleted')
  );
});

test('adminOperations users quota forwards parsed quota input', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const service = new FakeAdminOperationsService(null);
  const caller = createCaller(authService, service.asService());

  await caller.users.quota({ credits: 12, id: 'user-1', totalQuota: 40 });

  assert.deepEqual(service.lastQuotaInput, { credits: 12, id: 'user-1', totalQuota: 40 });
});

test('adminOperations system config update forwards parsed login idle timeout input', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const service = new FakeAdminOperationsService(null);
  const caller = createCaller(authService, service.asService());

  await caller.systemConfig.update({
    adminIdleTimeoutMinutes: 30,
    webIdleTimeoutMinutes: 1440,
  });

  assert.deepEqual(service.lastSystemConfigInput, {
    adminIdleTimeoutMinutes: 30,
    webIdleTimeoutMinutes: 1440,
  });
});

test('adminOperations system audit manual cleanup forwards parsed date range input', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const service = new FakeAdminOperationsService(null);
  const caller = createCaller(authService, service.asService());

  await caller.systemAudit.cleanupManual({
    startDate: '2026-05-01T00:00:00.000Z',
    endDate: '2026-05-31T23:59:59.000Z',
  });

  assert.deepEqual(service.lastCleanupRangeInput, {
    startDate: '2026-05-01T00:00:00.000Z',
    endDate: '2026-05-31T23:59:59.000Z',
  });
});

test('adminOperations system audit auto cleanup calls retention cleanup service', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const service = new FakeAdminOperationsService(null);
  const caller = createCaller(authService, service.asService());

  await caller.systemAudit.cleanupAuto();

  assert.equal(service.cleanupAutoCalls, 1);
});

test('adminOperations writes unified admin API audit entries', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const service = new FakeAdminOperationsService(null);
  const auditService = new FakeAdminAuditService();
  const caller = createCaller(authService, service.asService(), auditService.asService());

  await caller.users.quota({ credits: 12, id: 'user-1', totalQuota: 40 });

  assert.equal(auditService.records.length, 1);
  assert.deepEqual(auditService.records[0], {
    actorId: 'admin-user',
    actorAccount: 'admin_user',
    input: { credits: 12, id: 'user-1', totalQuota: 40 },
    ip: null,
    path: 'users.quota',
    result: { data: null, success: true },
    type: 'mutation',
    userAgent: null,
  });
});

test('admin operations domain codes are copied to serialized tRPC error data', () => {
  const shape = {
    message: 'Content audit session already deleted',
    code: -32009,
    data: {
      code: 'CONFLICT',
      httpStatus: 409,
      path: 'adminOperations.contentAudit.delete',
    },
  } as TRPCDefaultErrorShape;

  const formatted = formatTRPCErrorShape(shape, { domainCode: 'RESOURCE_ALREADY_DELETED' });

  assert.equal(formatted.data.domainCode, 'RESOURCE_ALREADY_DELETED');
});

class FakeAuthService {
  constructor(private readonly hasAdminSession: boolean) {}

  asAuthService(): AuthService {
    return this as unknown as AuthService;
  }

  async resolveAdminSession() {
    if (!this.hasAdminSession) {
      return null;
    }

    return {
      token: 'admin-token',
      user: {
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin',
        username: 'admin_user',
        avatar: null,
        role: 'admin',
      },
    };
  }
}

class FakeAdminOperationsService {
  cleanupAutoCalls = 0;
  lastCleanupRangeInput: unknown = null;
  lastQuotaInput: unknown = null;
  lastSystemConfigInput: unknown = null;

  constructor(private readonly error: Error | null) {}

  asService(): AdminOperationsService {
    return this as unknown as AdminOperationsService;
  }

  async updateUserStatus() {
    if (this.error) {
      throw this.error;
    }

    return null;
  }

  async deleteContentAuditSession() {
    if (this.error) {
      throw this.error;
    }

    return null;
  }

  async updateUserQuota(input: unknown) {
    this.lastQuotaInput = input;

    return null;
  }

  async updateSystemConfig(input: unknown) {
    this.lastSystemConfigInput = input;

    return null;
  }

  async cleanupSystemAuditLogsByDateRange(input: unknown) {
    this.lastCleanupRangeInput = input;

    return { deletedCount: 0 };
  }

  async cleanupSystemAuditLogsByRetention() {
    this.cleanupAutoCalls += 1;

    return { deletedCount: 0, retentionDays: 180 };
  }
}

class FakeAdminAuditService {
  records: AdminAuditRequestInput[] = [];

  asService(): AdminAuditService {
    return this as unknown as AdminAuditService;
  }

  async recordAdminApiRequest(input: AdminAuditRequestInput): Promise<void> {
    this.records.push(input);
  }
}

function createCaller(
  authService: AuthService,
  service: AdminOperationsService,
  auditService?: AdminAuditService | undefined
) {
  const router = createAdminOperationsRouter(authService, service, {
    createTRPCRouter,
    publicProcedure,
    adminAuditService: auditService,
  });

  return router.createCaller({ req: {}, res: {} } as never);
}

function trpcError(code: string, message: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof Error && 'code' in error && error.code === code && error.message === message;
}
