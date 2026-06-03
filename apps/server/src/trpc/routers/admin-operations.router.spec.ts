import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { initTRPC, type TRPCDefaultErrorShape } from '@trpc/server';

import type { AuthService } from '../../modules/auth/auth.service.js';
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
        avatar: null,
        role: 'admin',
      },
    };
  }
}

class FakeAdminOperationsService {
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
}

function createCaller(authService: AuthService, service: AdminOperationsService) {
  const router = createAdminOperationsRouter(authService, service, {
    createTRPCRouter,
    publicProcedure,
  });

  return router.createCaller({ req: {}, res: {} } as never);
}

function trpcError(code: string, message: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof Error && 'code' in error && error.code === code && error.message === message;
}
