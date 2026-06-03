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
  WeChatAccountInsert,
  WeChatAccountRow,
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
      username: string | null;
    };
  };
};

type WeChatLoginConfigResult = {
  appId: string;
  expiresInSeconds: number;
  redirectUri: string;
  scope: 'snsapi_login';
  state: string;
};

type WeChatLoginInput = {
  code: string;
  state: string;
};

type UserLoginInput = {
  password: string;
  user: string;
};

type UserLoginResult =
  | MockLoginResult
  | {
      error: {
        code: 'INVALID_CREDENTIALS';
        message: string;
      };
      success: false;
    };

type MockLoginCaller = {
  mockLogin: () => Promise<MockLoginResult>;
};

type WeChatAuthCaller = {
  wechatCallback: (input: WeChatLoginInput) => Promise<MockLoginResult>;
  wechatLoginConfig: () => Promise<WeChatLoginConfigResult>;
};

type MockLoginService = AuthService & {
  completeWeChatLogin: (input: WeChatLoginInput, context: TRPCContext) => Promise<MockLoginResult>;
  getWeChatLoginConfig: () => Promise<WeChatLoginConfigResult>;
  mockLogin: (context: TRPCContext) => Promise<MockLoginResult>;
  userLogin: (input: UserLoginInput, context: TRPCContext) => Promise<UserLoginResult>;
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
        username: null,
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

test('AuthService userLogin authenticates a normal user by username and writes user session', async () => {
  const repository = new FakeAuthRepository();
  const sessionStore = new FakeSessionStore();
  const service = createMockLoginService(repository, sessionStore);
  const { context, responseHeaders } = createContext({
    headers: { 'user-agent': 'web-login-test' },
    ip: '127.0.0.3',
  });
  const user = await repository.createUser({
    email: 'teacher@example.com',
    isActive: true,
    name: 'Teacher User',
    password: await hashTestPassword('teacher123'),
    role: 'user',
    username: 'teacher',
  });

  const result = await service.userLogin({ user: ' teacher ', password: 'teacher123' }, context);

  assert.equal(result.success, true);
  assert.equal(result.data.user.id, user.id);
  assert.equal(result.data.user.username, 'teacher');
  const session = repository.sessions[0];
  assert.ok(session);
  assert.equal(session.userId, user.id);
  assert.equal(session.userAgent, 'web-login-test');
  assert.equal(session.ip, '127.0.0.3');
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
});

test('AuthService userLogin rejects email login and admin accounts', async () => {
  const repository = new FakeAuthRepository();
  const sessionStore = new FakeSessionStore();
  const service = createMockLoginService(repository, sessionStore);
  const { context } = createContext();
  await repository.createUser({
    email: 'teacher@example.com',
    isActive: true,
    password: await hashTestPassword('teacher123'),
    role: 'user',
    username: 'teacher',
  });
  await repository.createUser({
    email: 'admin@example.com',
    isActive: true,
    password: await hashTestPassword('admin123'),
    role: 'admin',
    username: 'admin',
  });

  assert.deepEqual(
    await service.userLogin({ user: 'teacher@example.com', password: 'teacher123' }, context),
    {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      },
    }
  );
  assert.deepEqual(await service.userLogin({ user: 'admin', password: 'admin123' }, context), {
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid username or password',
    },
  });
  assert.equal(repository.sessions.length, 0);
  assert.equal(sessionStore.setCalls.length, 0);
});

test('auth wechatLoginConfig returns embedded QR config without app secret', async () => {
  await withEnv(
    {
      WECHAT_APP_ID: 'wx-test-app',
      WECHAT_APP_SECRET: 'wechat-secret',
      WECHAT_REDIRECT_URI: 'http://localhost:3000/auth/wechat/callback',
    },
    async () => {
      const repository = new FakeAuthRepository();
      const sessionStore = new FakeSessionStore();
      const service = createMockLoginService(repository, sessionStore);
      const { context } = createContext();
      const caller = createCaller(service, context) as unknown as WeChatAuthCaller;

      const result = await caller.wechatLoginConfig();

      assert.equal(result.appId, 'wx-test-app');
      assert.equal(result.redirectUri, 'http://localhost:3000/auth/wechat/callback');
      assert.equal(result.scope, 'snsapi_login');
      assert.equal(result.expiresInSeconds, 600);
      assert.equal(typeof result.state, 'string');
      assert.equal(result.state.length > 20, true);
      assert.equal(JSON.stringify(result).includes('wechat-secret'), false);
      assert.deepEqual(sessionStore.setCalls, [
        {
          key: `auth:wechat:state:${result.state}`,
          value: '1',
          mode: 'EX',
          ttl: 600,
        },
      ]);
    }
  );
});

test('AuthService completeWeChatLogin exchanges code and creates a user session', async () => {
  await withEnv(
    {
      WECHAT_APP_ID: 'wx-test-app',
      WECHAT_APP_SECRET: 'wechat-secret',
      WECHAT_REDIRECT_URI: 'http://localhost:3000/auth/wechat/callback',
    },
    async () => {
      const repository = new FakeAuthRepository();
      const sessionStore = new FakeSessionStore();
      const service = createMockLoginService(repository, sessionStore);
      const requestedUrls: string[] = [];
      Object.defineProperty(service, 'weChatApiFetch', {
        value: async (input: string | URL) => {
          const url = String(input);
          requestedUrls.push(url);

          if (url.startsWith('https://api.weixin.qq.com/sns/oauth2/access_token')) {
            return jsonResponse({
              access_token: 'wechat-access-token',
              expires_in: 7200,
              openid: 'openid-123',
              refresh_token: 'refresh-token',
              scope: 'snsapi_login',
              unionid: 'unionid-456',
            });
          }

          if (url.startsWith('https://api.weixin.qq.com/sns/userinfo')) {
            return jsonResponse({
              avatar_url: 'https://example.com/avatar.png',
              headimgurl: 'https://example.com/avatar.png',
              nickname: '微信用户',
              openid: 'openid-123',
              unionid: 'unionid-456',
            });
          }

          throw new Error(`Unexpected WeChat API URL: ${url}`);
        },
      });
      const { context, responseHeaders } = createContext({
        headers: { 'user-agent': 'wechat-test' },
        ip: '127.0.0.2',
      });
      const config = await service.getWeChatLoginConfig();

      const result = await service.completeWeChatLogin(
        { code: 'wx-code', state: config.state },
        context
      );

      const user = repository.users[0];
      assert.ok(user);
      assert.equal(user.email, 'wechat+openid-123@aethercore.local');
      assert.equal(user.name, '微信用户');
      assert.equal(user.role, 'user');
      assert.equal(result.data.user.id, user.id);
      const account = repository.weChatAccounts[0];
      assert.ok(account);
      assert.equal(account.id, 'wechat-account-1');
      assert.equal(account.userId, user.id);
      assert.equal(account.openid, 'openid-123');
      assert.equal(account.unionid, 'unionid-456');
      assert.equal(account.nickname, '微信用户');
      assert.equal(account.avatarUrl, 'https://example.com/avatar.png');
      assert.deepEqual(account.rawProfile, {
        avatar_url: 'https://example.com/avatar.png',
        headimgurl: 'https://example.com/avatar.png',
        nickname: '微信用户',
        openid: 'openid-123',
        unionid: 'unionid-456',
      });
      assert.equal(requestedUrls[0]?.includes('appid=wx-test-app'), true);
      assert.equal(requestedUrls[0]?.includes('secret=wechat-secret'), true);
      assert.equal(requestedUrls[0]?.includes('code=wx-code'), true);
      assert.equal(requestedUrls[1]?.includes('access_token=wechat-access-token'), true);
      assert.deepEqual(sessionStore.delCalls, [`auth:wechat:state:${config.state}`]);

      const session = repository.sessions[0];
      assert.ok(session);
      assert.equal(session.userId, user.id);
      assert.equal(session.userAgent, 'wechat-test');
      assert.equal(session.ip, '127.0.0.2');

      const setCookie = responseHeaders['Set-Cookie'];
      if (typeof setCookie !== 'string') {
        assert.fail('Set-Cookie header was not set');
      }
      assert.match(setCookie, new RegExp(`^aether_session=${session.token};`));
    }
  );
});

test('AuthService adminLogin authenticates by admin user name instead of email', async () => {
  const repository = new FakeAuthRepository();
  const sessionStore = new FakeSessionStore();
  const service = createMockLoginService(repository, sessionStore);
  const { context } = createContext();
  await repository.createUser({
    email: 'admin@example.com',
    isActive: true,
    password: await hashTestPassword('admin@123'),
    role: 'admin',
    username: 'admin',
  });

  const result = await service.adminLogin({ user: 'admin', password: 'admin@123' }, context);

  assert.equal(result.success, true);
  assert.deepEqual(
    await service.adminLogin({ user: 'admin@example.com', password: 'admin@123' }, context),
    {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      },
    }
  );
});

test('AuthService adminLogin omits Secure cookie when SESSION_COOKIE_SECURE is false', async () => {
  await withEnv({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' }, async () => {
    const repository = new FakeAuthRepository();
    const sessionStore = new FakeSessionStore();
    const service = createMockLoginService(repository, sessionStore);
    const { context, responseHeaders } = createContext();
    await repository.createUser({
      email: 'admin@example.com',
      isActive: true,
      password: await hashTestPassword('admin@123'),
      role: 'admin',
      username: 'admin',
    });

    const result = await service.adminLogin({ user: 'admin', password: 'admin@123' }, context);

    assert.equal(result.success, true);
    const setCookie = responseHeaders['Set-Cookie'];
    if (typeof setCookie !== 'string') {
      assert.fail('Set-Cookie header was not set');
    }
    assert.doesNotMatch(setCookie, /;\s*Secure(?:;|$)/);
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
          username: null,
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
  readonly weChatAccounts: WeChatAccountRow[] = [];

  asRepository(): AuthRepository {
    return this as unknown as AuthRepository;
  }

  async findUserByEmail(email: string): Promise<AuthUserRow | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserByUsername(username: string): Promise<AuthUserRow | null> {
    return this.users.find((user) => user.username === username) ?? null;
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
      username: input.username ?? null,
      isActive: input.isActive ?? true,
      isBlacklisted: input.isBlacklisted ?? false,
      createdAt: new Date('2026-05-20T00:00:00.000Z'),
      updatedAt: new Date('2026-05-20T00:00:00.000Z'),
      deletedAt: input.deletedAt ?? null,
    };

    this.users.push(user);

    return user;
  }

  async findWeChatAccountByOpenid(openid: string): Promise<WeChatAccountRow | null> {
    return this.weChatAccounts.find((account) => account.openid === openid) ?? null;
  }

  async findWeChatAccountByUnionid(unionid: string): Promise<WeChatAccountRow | null> {
    return this.weChatAccounts.find((account) => account.unionid === unionid) ?? null;
  }

  async createWeChatAccount(input: WeChatAccountInsert): Promise<WeChatAccountRow> {
    const account: WeChatAccountRow = {
      id: `wechat-account-${this.weChatAccounts.length + 1}`,
      userId: input.userId,
      openid: input.openid,
      unionid: input.unionid ?? null,
      nickname: input.nickname ?? null,
      avatarUrl: input.avatarUrl ?? null,
      rawProfile: input.rawProfile ?? null,
      createdAt: new Date('2026-05-20T00:00:00.000Z'),
      updatedAt: new Date('2026-05-20T00:00:00.000Z'),
    };

    this.weChatAccounts.push(account);

    return account;
  }

  async updateWeChatAccount(
    accountId: string,
    input: Partial<Pick<WeChatAccountRow, 'avatarUrl' | 'nickname' | 'rawProfile' | 'unionid'>>
  ): Promise<WeChatAccountRow | null> {
    const index = this.weChatAccounts.findIndex((account) => account.id === accountId);

    if (index === -1) {
      return null;
    }

    const account = this.weChatAccounts[index];

    if (!account) {
      return null;
    }

    const updated = {
      ...account,
      ...input,
      updatedAt: new Date('2026-05-21T00:00:00.000Z'),
    };
    this.weChatAccounts[index] = updated;

    return updated;
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
  private readonly values = new Map<string, string>();

  constructor(private readonly input: { rejectDelKeys?: string[] } = {}) {}

  async del(key: string): Promise<number> {
    this.delCalls.push(key);
    this.values.delete(key);

    if (this.input.rejectDelKeys?.includes(key)) {
      throw new Error('Redis del failed');
    }

    return 1;
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string, mode: 'EX', ttl: number): Promise<'OK'> {
    this.setCalls.push({ key, value, mode, ttl });
    this.values.set(key, value);

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
      username: user.username,
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
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
