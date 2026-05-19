import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { initTRPC, type TRPCDefaultErrorShape } from '@trpc/server';

import type { AuthService } from '../../modules/auth/auth.service.js';
import {
  AdminResourcesServiceError,
  type AdminResourcesService,
} from '../../modules/admin-resources/admin-resources.service.js';
import type { TRPCContext } from '../context.js';
import { formatTRPCErrorShape } from '../router.js';
import { createAdminResourcesRouter } from './admin-resources.router.js';

const t = initTRPC.context<TRPCContext>().create();
const createTRPCRouter = t.router;
const publicProcedure = t.procedure;

test('adminResources agents create requires an admin session', async () => {
  const authService = new FakeAuthService(false).asAuthService();
  const service = new FakeAdminResourcesService(null).asService();
  const caller = createCaller(authService, service);

  await assert.rejects(
    () =>
      caller.agents.create({
        key: 'chat',
        name: 'Chat Agent',
        engineId: 'engine-1',
        promptId: null,
        sensitiveListId: null,
      }),
    trpcError('UNAUTHORIZED', 'Admin session required')
  );
});

test('adminResources agents create checks admin session before validating malformed input', async () => {
  const authService = new FakeAuthService(false).asAuthService();
  const service = new FakeAdminResourcesService(null).asService();
  const caller = createCaller(authService, service);

  await assert.rejects(
    () => caller.agents.create({} as never),
    trpcError('UNAUTHORIZED', 'Admin session required')
  );
});

test('adminResources prompt delete maps service conflicts to tRPC conflicts', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const service = new FakeAdminResourcesService(
    new AdminResourcesServiceError('CONFLICT', 'Resource is in use')
  ).asService();
  const caller = createCaller(authService, service);

  await assert.rejects(
    () => caller.prompts.delete({ id: 'prompt-1' }),
    trpcError('CONFLICT', 'Resource is in use')
  );
});

test('admin resource domain codes are copied to serialized tRPC error data', () => {
  const shape = {
    message: 'Engine name already exists',
    code: -32009,
    data: {
      code: 'CONFLICT',
      httpStatus: 409,
      path: 'adminResources.engines.create',
    },
  } as TRPCDefaultErrorShape;

  const formatted = formatTRPCErrorShape(shape, { domainCode: 'DUPLICATE_ENGINE_NAME' });

  assert.equal(formatted.data.domainCode, 'DUPLICATE_ENGINE_NAME');
});

test('invalid admin resource domain codes are not copied to serialized tRPC error data', () => {
  const shape = {
    message: 'Engine name already exists',
    code: -32009,
    data: {
      code: 'CONFLICT',
      httpStatus: 409,
      path: 'adminResources.engines.create',
    },
  } as TRPCDefaultErrorShape;

  const formatted = formatTRPCErrorShape(shape, { domainCode: 'NOPE' });

  assert.equal('domainCode' in formatted.data, false);
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

class FakeAdminResourcesService {
  constructor(private readonly error: Error | null) {}

  asService(): AdminResourcesService {
    return this as unknown as AdminResourcesService;
  }

  async createAgent() {
    if (this.error) {
      throw this.error;
    }

    return null;
  }

  async deletePrompt() {
    if (this.error) {
      throw this.error;
    }

    return null;
  }
}

function createCaller(authService: AuthService, service: AdminResourcesService) {
  const router = createAdminResourcesRouter(authService, service, {
    createTRPCRouter,
    publicProcedure,
  });

  return router.createCaller({ req: {}, res: {} } as never);
}

function trpcError(code: string, message: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof Error && 'code' in error && error.code === code && error.message === message;
}
