import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuthService } from '../auth/auth.service.js';
import { CommentsController } from './comments.controller.js';
import type { CommentsService } from './comments.service.js';

test('comment stream response forwards refreshed session cookie in raw headers', async () => {
  const reply = createStreamReply();
  const controller = new CommentsController(
    new FakeAuthService().asAuthService(),
    new FakeCommentsService().asCommentsService()
  );

  await controller.generateSingleStream(
    {
      gender: '男',
      grade: '三年级',
      tags: ['学习认真'],
    },
    createStreamRequest(),
    reply.asReply()
  );

  assert.equal(reply.writeHeadStatus, 200);
  assert.equal(reply.writeHeadHeaders['Set-Cookie'], 'aether_session=refreshed; Max-Age=2700');
});

class FakeAuthService {
  asAuthService(): AuthService {
    return this as unknown as AuthService;
  }

  async resolveUserSession(context: { res: { header: (name: string, value: string) => void } }) {
    context.res.header('Set-Cookie', 'aether_session=refreshed; Max-Age=2700');

    return {
      token: 'token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        username: 'user',
        role: 'user',
        isBlacklisted: false,
      },
    };
  }
}

class FakeCommentsService {
  asCommentsService(): CommentsService {
    return this as unknown as CommentsService;
  }

  async generateSingleStream(_input: unknown, emit: (content: string) => void) {
    emit('评语内容');

    return {
      content: '评语内容',
      sessionId: 'session-1',
    };
  }
}

function createStreamRequest() {
  return {
    headers: {},
    ip: '127.0.0.1',
  } as never;
}

function createStreamReply() {
  const headers: Record<string, string> = {};
  const state = {
    writeHeadHeaders: {} as Record<string, string>,
    writeHeadStatus: 0,
  };

  return {
    get writeHeadHeaders() {
      return state.writeHeadHeaders;
    },
    get writeHeadStatus() {
      return state.writeHeadStatus;
    },
    asReply() {
      return {
        code: () => this.asReply(),
        getHeader: (name: string) => headers[name] ?? headers[name.toLowerCase()],
        header: (name: string, value: string) => {
          headers[name] = value;
        },
        raw: {
          end: () => undefined,
          write: () => true,
          writeHead: (statusCode: number, responseHeaders: Record<string, string>) => {
            state.writeHeadStatus = statusCode;
            state.writeHeadHeaders = responseHeaders;
          },
        },
        send: () => undefined,
      } as never;
    },
  };
}
