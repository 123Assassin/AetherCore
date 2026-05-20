import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { initTRPC } from '@trpc/server';

import type { AiService } from '../../modules/ai/ai.service.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { TRPCContext } from '../context.js';
import { createAiRouter } from './ai.router.js';

const t = initTRPC.context<TRPCContext>().create();
const createTRPCRouter = t.router;
const publicProcedure = t.procedure;

test('AI generation rejects blacklisted users before calling service', async () => {
  const authService = new FakeAuthService(true).asAuthService();
  const aiService = new FakeAiService();
  const caller = createCaller(authService, aiService.asAiService());

  await assert.rejects(
    () => caller.chat.send({ message: 'hello' }),
    (error) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is blacklisted'
  );
  assert.equal(aiService.calls, 0);
});

class FakeAuthService {
  constructor(private readonly isBlacklisted: boolean) {}

  asAuthService(): AuthService {
    return this as unknown as AuthService;
  }

  async resolveUserSession() {
    return {
      token: 'user-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'user',
        isBlacklisted: this.isBlacklisted,
      },
    };
  }
}

class FakeAiService {
  calls = 0;

  asAiService(): AiService {
    return this as unknown as AiService;
  }

  async sendChat() {
    this.calls += 1;

    return {
      sessionId: 'session-1',
      events: [],
    };
  }
}

function createCaller(authService: AuthService, aiService: AiService) {
  const router = createAiRouter(authService, aiService, {
    createTRPCRouter,
    publicProcedure,
  });

  return router.createCaller({ req: {}, res: {} } as never);
}
