import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuthService } from '../../modules/auth/auth.service.js';
import type { CommentsService } from '../../modules/comments/comments.service.js';
import {
  SimulationsServiceError,
  type SimulationsService,
} from '../../modules/simulations/simulations.service.js';
import { createAppRouter } from '../router.js';

test('adminSimulations.update maps service bad requests to tRPC bad requests', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const simulationsService = new FakeSimulationsService(
    new SimulationsServiceError('BAD_REQUEST', 'Invalid category')
  ).asSimulationsService();
  const caller = createCaller(authService, simulationsService);

  await assert.rejects(
    () => caller.adminSimulations.update({ id: 'sim-enabled', categoryId: 'math' }),
    trpcError('BAD_REQUEST', 'Invalid category')
  );
});

test('adminSimulations.update requires an admin session', async () => {
  const authService = new FakeAuthService(false).asAuthService();
  const fakeSimulationsService = new FakeSimulationsService(null);
  const caller = createCaller(authService, fakeSimulationsService.asSimulationsService());

  await assert.rejects(
    () => caller.adminSimulations.update({ id: 'sim-enabled', name: 'Updated Simulation' }),
    trpcError('UNAUTHORIZED', 'Admin session required')
  );
  assert.equal(fakeSimulationsService.updateCalls, 0);
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

class FakeSimulationsService {
  updateCalls = 0;

  constructor(private readonly updateError: Error | null) {}

  asSimulationsService(): SimulationsService {
    return this as unknown as SimulationsService;
  }

  async update() {
    this.updateCalls += 1;

    if (this.updateError) {
      throw this.updateError;
    }

    return null;
  }
}

function createCaller(authService: AuthService, simulationsService: SimulationsService) {
  const router = createAppRouter(
    authService,
    {} as never,
    simulationsService,
    {} as CommentsService
  );

  return router.createCaller({ req: {}, res: {} } as never);
}

function trpcError(code: string, message: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof Error && 'code' in error && error.code === code && error.message === message;
}
