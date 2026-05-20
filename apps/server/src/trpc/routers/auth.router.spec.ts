import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { initTRPC } from '@trpc/server';

import { AuthService } from '../../modules/auth/auth.service.js';
import type {
  AuthRepository,
  AuthSessionRow,
  AuthUserInsert,
  AuthUserRow,
} from '../../modules/auth/auth.repository.js';
import type { TRPCContext } from '../context.js';
import { createAuthRouter } from './auth.router.js';

const t = initTRPC.context<TRPCContext>().create();
const createTRPCRouter = t.router;
const publicProcedure = t.procedure;

type MockLoginResult = {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
};

type MockLoginCaller = {
  mockLogin: () => Promise<MockLoginResult>;
};

type MockLoginService = AuthService & {
  mockLogin: (context: TRPCContext) => Promise<MockLoginResult>;
};

test('auth mockLogin mutation delegates to AuthService with request context', async () => {
  const fakeAuthService = new FakeAuthService();
  const { context } = createContext();
  const caller = createCaller(
    fakeAuthService.asAuthService(),
    context
  ) as unknown as MockLoginCaller;

  const result = await caller.mockLogin();

  assert.equal(fakeAuthService.receivedContext, context);
  assert.deepEqual(result, {
    success: true,
    data: {
      user: {
        id: 'mock-user',
        email: 'mock.user@example.com',
        name: 'Mock User',
      },
    },
  });
});

test('AuthService mockLogin creates a normal user session and user cookie in test', async () => {
  await withEnv({ AUTH_MOCK_LOGIN_ENABLED: undefined, NODE_ENV: 'test' }, async () => {
    const repository = new FakeAuthRepository();
    const sessionStore = new FakeSessionStore();
    const service = createMockLoginService(repository, sessionStore);
    const { context, responseHeaders } = createContext({
      headers: { 'user-agent': 'node-test' },
      ip: '127.0.0.1',
    });

    const result = await service.mockLogin(context);

    const user = repository.users[0];
    assert.ok(user);
    assert.equal(user.email, 'dev.user@aethercore.local');
    assert.equal(user.role, 'user');
    assert.equal(user.isActive, true);
    assert.equal(result.data.user.id, user.id);

    const session = repository.sessions[0];
    assert.ok(session);
    assert.equal(session.userId, user.id);
    assert.equal(session.userAgent, 'node-test');
    assert.equal(session.ip, '127.0.0.1');

    assert.deepEqual(sessionStore.setCalls, [
      {
        key: `session:${session.token}`,
        value: JSON.stringify({ userId: user.id, role: 'user' }),
        mode: 'EX',
        ttl: 604800,
      },
    ]);

    const setCookie = responseHeaders['Set-Cookie'];
    if (typeof setCookie !== 'string') {
      assert.fail('Set-Cookie header was not set');
    }

    assert.match(setCookie, new RegExp(`^aether_session=${session.token};`));
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /Max-Age=604800/);
  });
});

test('AuthService mockLogin is disabled in production without explicit opt-in', async () => {
  await withEnv({ AUTH_MOCK_LOGIN_ENABLED: undefined, NODE_ENV: 'production' }, async () => {
    const repository = new FakeAuthRepository();
    const sessionStore = new FakeSessionStore();
    const service = createMockLoginService(repository, sessionStore);
    const { context } = createContext();

    await assert.rejects(
      () => service.mockLogin(context),
      (error) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'FORBIDDEN' &&
        error.message === 'Mock login is disabled'
    );
    assert.equal(repository.users.length, 0);
    assert.equal(repository.sessions.length, 0);
    assert.equal(sessionStore.setCalls.length, 0);
  });
});

class FakeAuthService {
  receivedContext: TRPCContext | null = null;

  asAuthService(): AuthService {
    return this as unknown as AuthService;
  }

  async mockLogin(context: TRPCContext): Promise<MockLoginResult> {
    this.receivedContext = context;

    return {
      success: true,
      data: {
        user: {
          id: 'mock-user',
          email: 'mock.user@example.com',
          name: 'Mock User',
        },
      },
    };
  }
}

class FakeAuthRepository {
  readonly users: AuthUserRow[] = [];
  readonly sessions: Array<Omit<AuthSessionRow, 'id' | 'createdAt'>> = [];

  asRepository(): AuthRepository {
    return this as unknown as AuthRepository;
  }

  async findUserByEmail(email: string): Promise<AuthUserRow | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async createUser(input: AuthUserInsert): Promise<AuthUserRow> {
    const user: AuthUserRow = {
      id: `user-${this.users.length + 1}`,
      email: input.email,
      name: input.name ?? null,
      password: input.password,
      role: input.role ?? 'user',
      isActive: input.isActive ?? true,
      isBlacklisted: input.isBlacklisted ?? false,
      createdAt: new Date('2026-05-20T00:00:00.000Z'),
      updatedAt: new Date('2026-05-20T00:00:00.000Z'),
      deletedAt: input.deletedAt ?? null,
    };

    this.users.push(user);

    return user;
  }

  async createSession(input: Omit<AuthSessionRow, 'id' | 'createdAt'>): Promise<void> {
    this.sessions.push(input);
  }
}

class FakeSessionStore {
  readonly setCalls: Array<{ key: string; value: string; mode: 'EX'; ttl: number }> = [];

  async set(key: string, value: string, mode: 'EX', ttl: number): Promise<'OK'> {
    this.setCalls.push({ key, value, mode, ttl });

    return 'OK';
  }
}

function createCaller(authService: AuthService, context: TRPCContext) {
  const router = createAuthRouter(authService, {
    createTRPCRouter,
    publicProcedure,
  });

  return router.createCaller(context);
}

function createMockLoginService(
  repository: FakeAuthRepository,
  sessionStore: FakeSessionStore
): MockLoginService {
  const service = new AuthService(repository.asRepository()) as MockLoginService;
  Object.defineProperty(service, 'sessionStore', { value: sessionStore });

  return service;
}

function createContext(input?: { headers?: Record<string, string>; ip?: string }): {
  context: TRPCContext;
  responseHeaders: Record<string, string>;
} {
  const responseHeaders: Record<string, string> = {};
  const context = {
    req: {
      headers: input?.headers ?? {},
      ip: input?.ip ?? null,
    },
    res: {
      header(name: string, value: string) {
        responseHeaders[name] = value;
      },
    },
  } as unknown as TRPCContext;

  return { context, responseHeaders };
}

async function withEnv(
  values: Record<string, string | undefined>,
  callback: () => Promise<void>
): Promise<void> {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]])
  ) as Record<string, string | undefined>;

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
