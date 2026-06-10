import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuthService } from '../auth/auth.service.js';
import { AiController } from './ai.controller.js';
import type { AiService } from './ai.service.js';

test('AI stream response forwards refreshed session cookie in raw headers', async () => {
  const reply = createStreamReply();
  const controller = new AiController(
    new FakeAuthService().asAuthService(),
    new FakeAiService().asAiService()
  );

  await controller.sendChatStream({ message: 'hello' }, createStreamRequest(), reply.asReply());

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

class FakeAiService {
  asAiService(): AiService {
    return this as unknown as AiService;
  }

  async sendChatStream(
    _input: unknown,
    emit: (event: { messageId: string; sessionId: string; type: 'done' }) => void
  ) {
    emit({ messageId: 'message-1', sessionId: 'conversation-1', type: 'done' });
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
