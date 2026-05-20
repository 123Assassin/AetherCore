import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminSessionKey, hashPassword, verifyPassword } from '@package/auth';
import { initTRPC } from '@trpc/server';

import { AuthService } from '../../modules/auth/auth.service.js';
import type {
  AuthRepository,
  AuthSessionRow,
  AuthUserInsert,
  AuthUserRow,
} from '../../modules/auth/auth.repository.js';
import type { TRPCContext } from '../context.js';
import { createAdminAuthRouter, createAuthRouter } from './auth.router.js';

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

test('AuthService changeAdminPassword verifies current password and stores a new hash', async () => {
  const repository = new FakeAuthRepository();
  const sessionStore = new FakeSessionStore();
  const service = createMockLoginService(repository, sessionStore);
  const { context, responseHeaders } = createContext({
    headers: { 'user-agent': 'password-change-test' },
    ip: '10.0.0.8',
  });
  const admin = await repository.createUser({
    email: 'admin@example.com',
    isActive: true,
    password: await hashTestPassword('old-password'),
    role: 'admin',
  });
  const otherUser = await repository.createUser({
    email: 'user@example.com',
    isActive: true,
    password: await hashTestPassword('user-password'),
    role: 'user',
  });
  await repository.createSession(createSessionRow(admin.id, 'admin-token'));
  await repository.createSession(createSessionRow(admin.id, 'admin-token-2'));
  await repository.createSession(createSessionRow(otherUser.id, 'user-token'));

  const result = await service.changeAdminPassword(
    { currentPassword: 'old-password', newPassword: 'new-password' },
    createAdminSession(admin),
    context
  );

  assert.deepEqual(result, { success: true });
  const updatedAdmin = repository.users.find((user) => user.id === admin.id);
  assert.ok(updatedAdmin);
  assert.equal(await verifyTestPassword('new-password', updatedAdmin.password), true);
  assert.equal(await verifyTestPassword('old-password', updatedAdmin.password), false);
  assert.deepEqual(repository.auditLogs, [
    {
      actorType: 'admin',
      actorId: admin.id,
      action: 'admin.password.change',
      resourceType: 'admin_user',
      resourceId: admin.id,
      ip: '10.0.0.8',
      userAgent: 'password-change-test',
      metadata: { email: admin.email },
    },
  ]);
  assert.deepEqual(
    repository.sessions.map((session) => session.token),
    ['user-token']
  );
  assert.deepEqual(sessionStore.delCalls, [
    adminSessionKey('admin-token'),
    adminSessionKey('admin-token-2'),
  ]);

  const setCookie = responseHeaders['Set-Cookie'];
  if (typeof setCookie !== 'string') {
    assert.fail('Set-Cookie header was not set');
  }
  assert.match(setCookie, /^aether_admin_session=;/);
  assert.match(setCookie, /Max-Age=0/);
});

test('AuthService changeAdminPassword rejects an incorrect current password', async () => {
  const repository = new FakeAuthRepository();
  const sessionStore = new FakeSessionStore();
  const service = createMockLoginService(repository, sessionStore);
  const { context, responseHeaders } = createContext();
  const admin = await repository.createUser({
    email: 'admin@example.com',
    isActive: true,
    password: await hashTestPassword('old-password'),
    role: 'admin',
  });
  const originalHash = admin.password;
  await repository.createSession(createSessionRow(admin.id, 'admin-token'));

  await assert.rejects(
    () =>
      service.changeAdminPassword(
        { currentPassword: 'wrong-password', newPassword: 'new-password' },
        createAdminSession(admin),
        context
      ),
    (error) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'UNAUTHORIZED' &&
      error.message === 'Current password is incorrect'
  );
  assert.equal(repository.users.find((user) => user.id === admin.id)?.password, originalHash);
  assert.equal(repository.auditLogs.length, 0);
  assert.deepEqual(
    repository.sessions.map((session) => session.token),
    ['admin-token']
  );
  assert.equal(sessionStore.delCalls.length, 0);
  assert.equal(responseHeaders['Set-Cookie'], undefined);
});

test('AuthService changeAdminPassword succeeds and deletes DB sessions when Redis cleanup fails', async () => {
  const repository = new FakeAuthRepository();
  const sessionStore = new FakeSessionStore({
    rejectDelKeys: [adminSessionKey('admin-token')],
  });
  const service = createMockLoginService(repository, sessionStore);
  const { context, responseHeaders } = createContext();
  const admin = await repository.createUser({
    email: 'admin@example.com',
    isActive: true,
    password: await hashTestPassword('old-password'),
    role: 'admin',
  });
  await repository.createSession(createSessionRow(admin.id, 'admin-token'));

  const result = await service.changeAdminPassword(
    { currentPassword: 'old-password', newPassword: 'new-password' },
    createAdminSession(admin),
    context
  );

  assert.deepEqual(result, { success: true });
  const updatedAdmin = repository.users.find((user) => user.id === admin.id);
  assert.ok(updatedAdmin);
  assert.equal(await verifyTestPassword('new-password', updatedAdmin.password), true);
  assert.deepEqual(repository.sessions, []);
  assert.deepEqual(sessionStore.delCalls, [adminSessionKey('admin-token')]);

  const setCookie = responseHeaders['Set-Cookie'];
  if (typeof setCookie !== 'string') {
    assert.fail('Set-Cookie header was not set');
  }
  assert.match(setCookie, /^aether_admin_session=;/);
  assert.match(setCookie, /Max-Age=0/);
});

test('AuthService changeAdminPassword rejects weak new passwords', async () => {
  const repository = new FakeAuthRepository();
  const sessionStore = new FakeSessionStore();
  const service = createMockLoginService(repository, sessionStore);
  const { context, responseHeaders } = createContext();
  const admin = await repository.createUser({
    email: 'admin@example.com',
    isActive: true,
    password: await hashTestPassword('old-password'),
    role: 'admin',
  });
  const originalHash = admin.password;
  await repository.createSession(createSessionRow(admin.id, 'admin-token'));

  await assert.rejects(
    () =>
      service.changeAdminPassword(
        { currentPassword: 'old-password', newPassword: 'short' },
        createAdminSession(admin),
        context
      ),
    (error) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'BAD_REQUEST' &&
      error.message === 'New password must be at least 8 characters'
  );
  assert.equal(repository.users.find((user) => user.id === admin.id)?.password, originalHash);
  assert.equal(repository.auditLogs.length, 0);
  assert.deepEqual(
    repository.sessions.map((session) => session.token),
    ['admin-token']
  );
  assert.equal(sessionStore.delCalls.length, 0);
  assert.equal(responseHeaders['Set-Cookie'], undefined);
});

test('adminAuth changePassword requires an admin session', async () => {
  const fakeAuthService = new FakeAuthService();
  const { context } = createContext();
  const caller = createAdminAuthCaller(fakeAuthService.asAuthService(), context);

  await assert.rejects(
    () => caller.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' }),
    (error) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'UNAUTHORIZED' &&
      error.message === 'Admin session required'
  );
});

test('adminAuth changePassword checks admin session before validating malformed input', async () => {
  const fakeAuthService = new FakeAuthService();
  const { context } = createContext();
  const caller = createAdminAuthCaller(fakeAuthService.asAuthService(), context);

  await assert.rejects(
    () => caller.changePassword({} as never),
    (error) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'UNAUTHORIZED' &&
      error.message === 'Admin session required'
  );
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

  async resolveAdminSession() {
    return null;
  }
}

class FakeAuthRepository {
  readonly users: AuthUserRow[] = [];
  readonly sessions: Array<Omit<AuthSessionRow, 'id' | 'createdAt'>> = [];
  readonly auditLogs: SystemAuditLogSaveData[] = [];

  asRepository(): AuthRepository {
    return this as unknown as AuthRepository;
  }

  async findUserByEmail(email: string): Promise<AuthUserRow | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(userId: string): Promise<AuthUserRow | null> {
    return this.users.find((user) => user.id === userId) ?? null;
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

  async listSessionTokensByUserId(userId: string): Promise<string[]> {
    return this.sessions
      .filter((session) => session.userId === userId)
      .map((session) => session.token);
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    for (let index = this.sessions.length - 1; index >= 0; index -= 1) {
      if (this.sessions[index]?.userId === userId) {
        this.sessions.splice(index, 1);
      }
    }
  }

  async updateUser(
    userId: string,
    input: Partial<Pick<AuthUserRow, 'email' | 'name' | 'password' | 'role' | 'isActive'>>
  ): Promise<AuthUserRow | null> {
    const index = this.users.findIndex((user) => user.id === userId);

    if (index === -1) {
      return null;
    }

    const current = this.users[index];

    if (!current) {
      return null;
    }

    const updated: AuthUserRow = {
      ...current,
      ...input,
      updatedAt: new Date('2026-05-21T00:00:00.000Z'),
    };

    this.users[index] = updated;

    return updated;
  }

  async createSystemAuditLog(input: SystemAuditLogSaveData): Promise<void> {
    this.auditLogs.push(input);
  }
}

class FakeSessionStore {
  readonly delCalls: string[] = [];
  readonly setCalls: Array<{ key: string; value: string; mode: 'EX'; ttl: number }> = [];

  constructor(private readonly input: { rejectDelKeys?: string[] } = {}) {}

  async del(key: string): Promise<number> {
    this.delCalls.push(key);

    if (this.input.rejectDelKeys?.includes(key)) {
      throw new Error('Redis del failed');
    }

    return 1;
  }

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

function createAdminAuthCaller(authService: AuthService, context: TRPCContext) {
  const router = createAdminAuthRouter(authService, {
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

function createAdminSession(user: AuthUserRow) {
  return {
    token: 'admin-token',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'admin',
      isBlacklisted: user.isBlacklisted,
    },
  } as const;
}

function createSessionRow(userId: string, token: string): Omit<AuthSessionRow, 'id' | 'createdAt'> {
  return {
    userId,
    token,
    userAgent: 'node-test',
    ip: '127.0.0.1',
    expiresAt: new Date('2026-05-21T02:00:00.000Z'),
  };
}

type SystemAuditLogSaveData = {
  actorType: 'admin' | 'user' | 'system';
  actorId: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

async function hashTestPassword(password: string): Promise<string> {
  return hashPassword(password, 4);
}

async function verifyTestPassword(password: string, hash: string): Promise<boolean> {
  return verifyPassword(password, hash);
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
