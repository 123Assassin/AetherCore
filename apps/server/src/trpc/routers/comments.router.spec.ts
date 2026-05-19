import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AiService } from '../../modules/ai/ai.service.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { CommentsService } from '../../modules/comments/comments.service.js';
import type { SimulationsService } from '../../modules/simulations/simulations.service.js';
import { createAppRouter } from '../router.js';

test('comments.single.generate rejects non-array tags before service call', async () => {
  const commentsService = new FakeCommentsService().asCommentsService();
  const caller = createCaller(new FakeAuthService(true).asAuthService(), commentsService);

  await assert.rejects(
    () =>
      caller.comments.single.generate({
        gender: '男',
        grade: '三年级',
        tags: '思维活跃',
      } as never),
    trpcError('BAD_REQUEST', 'Comment tags must be an array')
  );
  assert.equal((commentsService as unknown as FakeCommentsService).singleCalls, 0);
});

test('comments.batch.generateRow requires a user session', async () => {
  const fakeCommentsService = new FakeCommentsService();
  const caller = createCaller(
    new FakeAuthService(false).asAuthService(),
    fakeCommentsService.asCommentsService()
  );

  await assert.rejects(
    () => caller.comments.batch.generateRow({ jobId: 'job-1', rowId: 'row-1' }),
    trpcError('UNAUTHORIZED', 'User session required')
  );
  assert.equal(fakeCommentsService.rowCalls, 0);
});

class FakeAuthService {
  constructor(private readonly hasUserSession: boolean) {}

  asAuthService(): AuthService {
    return this as unknown as AuthService;
  }

  async resolveUserSession() {
    if (!this.hasUserSession) {
      return null;
    }

    return {
      token: 'user-token',
      user: {
        id: 'user-1',
        email: 'teacher@example.com',
        name: 'Teacher',
        role: 'user',
      },
    };
  }
}

class FakeCommentsService {
  singleCalls = 0;
  rowCalls = 0;

  asCommentsService(): CommentsService {
    return this as unknown as CommentsService;
  }

  async generateSingle() {
    this.singleCalls += 1;

    return null;
  }

  async generateRow() {
    this.rowCalls += 1;

    return null;
  }
}

function createCaller(authService: AuthService, commentsService: CommentsService) {
  const router = createAppRouter(
    authService,
    {} as AiService,
    {} as SimulationsService,
    commentsService
  );

  return router.createCaller({ req: {}, res: {} } as never);
}

function trpcError(code: string, message: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof Error && 'code' in error && error.code === code && error.message === message;
}
