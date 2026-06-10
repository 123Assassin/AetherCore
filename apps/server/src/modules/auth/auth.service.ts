import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  adminSessionKey,
  hashPassword,
  parseSessionPayload,
  redis,
  serializeSessionPayload,
  sessionKey,
  verifyPassword,
} from '@package/auth';

import type { TRPCContext } from '../../trpc/context.js';
import {
  AuthRepository,
  type AuthUserRow,
  type SystemAuthConfigRow,
  type WeChatAccountRow,
} from './auth.repository.js';

const DEFAULT_ADMIN_IDLE_TIMEOUT_MINUTES = 120;
const DEFAULT_USER_IDLE_TIMEOUT_MINUTES = 7 * 24 * 60;
const WECHAT_STATE_TTL_SECONDS = 10 * 60;
const DEFAULT_MOCK_USER_EMAIL = 'dev.user@aethercore.local';
const DEFAULT_MOCK_USER_NAME = 'AetherCore Dev User';

const INVALID_ADMIN_LOGIN: AdminLoginResult = {
  success: false,
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid username or password',
  },
};

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: 'user' | 'admin';
  isBlacklisted: boolean;
};

type AuthUserSummary = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
};

type AdminLoginInput = {
  user: string;
  password: string;
};

type UserLoginInput = AdminLoginInput;

type AdminChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

type AdminLoginResult =
  | {
      success: true;
      data: {
        user: AuthUserSummary;
      };
    }
  | {
      success: false;
      error: {
        code: 'INVALID_CREDENTIALS';
        message: string;
      };
    };

type UserLoginResult = AdminLoginResult;

type AdminSessionResult =
  | {
      authenticated: true;
      user: AuthUserSummary;
    }
  | {
      authenticated: false;
    };

type LogoutResult = {
  success: true;
};

type PasswordChangeResult = {
  success: true;
};

type MockLoginResult = {
  success: true;
  data: {
    user: AuthUserSummary;
  };
};

type WeChatLoginUrlResult = {
  url: string;
  state: string;
  expiresInSeconds: number;
};

type WeChatLoginConfigResult = {
  appId: string;
  redirectUri: string;
  scope: 'snsapi_login';
  state: string;
  expiresInSeconds: number;
};

type WeChatCallbackInput = {
  code: string;
  state: string;
};

type WeChatTokenResponse = {
  access_token: string;
  openid: string;
  unionid?: string;
};

type WeChatUserInfoResponse = {
  headimgurl?: string;
  nickname?: string;
  openid?: string;
  unionid?: string;
};

type WeChatApiErrorResponse = {
  errcode?: number;
  errmsg?: string;
};

type MeProfile = {
  id: string;
  email: string;
  name: string | null;
};

type MePreferences = {
  grade: string | null;
  subject: string | null;
};

type MeCredits = {
  balance: number;
  cycleLimit: number;
  cycleDays: number;
  resetAt: string | null;
};

export type UserSession = {
  token: string;
  user: AuthenticatedUser & { role: 'user' };
};

export type AdminSession = {
  token: string;
  user: AuthenticatedUser & { role: 'admin' };
};

export class AuthServiceError extends Error {
  constructor(
    readonly code: 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'UNAUTHORIZED',
    message: string
  ) {
    super(message);
  }
}

type SessionStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

@Injectable()
export class AuthService {
  private readonly sessionStore: SessionStore = redis;
  private readonly weChatApiFetch: typeof fetch = fetch;

  constructor(private readonly authRepository: AuthRepository) {}

  async getWeChatLoginUrl(): Promise<WeChatLoginUrlResult> {
    const config = await this.getWeChatLoginConfig();
    const params = new URLSearchParams({
      appid: config.appId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state: config.state,
    });

    return {
      url: `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`,
      state: config.state,
      expiresInSeconds: config.expiresInSeconds,
    };
  }

  async getWeChatLoginConfig(): Promise<WeChatLoginConfigResult> {
    const state = createToken(16);
    const appId = requireEnv('WECHAT_APP_ID', 'WeChat AppID is not configured');
    const redirectUri =
      process.env.WECHAT_REDIRECT_URI ||
      `${process.env.WEB_HTTP_URL || 'http://localhost:3000'}/auth/wechat/callback`;

    await this.storeWeChatStateBestEffort(state);

    return {
      appId,
      redirectUri,
      scope: 'snsapi_login',
      state,
      expiresInSeconds: WECHAT_STATE_TTL_SECONDS,
    };
  }

  async mockLogin(context: TRPCContext): Promise<MockLoginResult> {
    if (!isMockLoginEnabled()) {
      throw new AuthServiceError('FORBIDDEN', 'Mock login is disabled');
    }

    const user = await this.findOrCreateMockUser();

    return this.createUserLoginSession(user, context);
  }

  async completeWeChatLogin(
    input: WeChatCallbackInput,
    context: TRPCContext
  ): Promise<MockLoginResult> {
    const code = requireTrimmed(input.code, 'WeChat login code is required');
    const state = requireTrimmed(input.state, 'WeChat login state is required');

    await this.consumeWeChatState(state);
    const token = await this.exchangeWeChatCode(code);
    const profile = await this.fetchWeChatUserInfo(token.access_token, token.openid);
    const user = await this.findOrCreateWeChatUser(token, profile);

    return this.createUserLoginSession(user, context);
  }

  async userLogin(input: UserLoginInput, context: TRPCContext): Promise<UserLoginResult> {
    const username = input.user.trim();
    const user = username ? await this.authRepository.findUserByUsername(username) : null;

    if (!user || user.role !== 'user' || !user.isActive) {
      return INVALID_ADMIN_LOGIN;
    }

    const passwordMatches = await verifyPassword(input.password, user.password);

    if (!passwordMatches) {
      return INVALID_ADMIN_LOGIN;
    }

    return this.createUserLoginSession(user, context);
  }

  async adminLogin(input: AdminLoginInput, context: TRPCContext): Promise<AdminLoginResult> {
    const user = await this.authRepository.findUserByUsername(input.user);

    if (!user || user.role !== 'admin' || !user.isActive) {
      return INVALID_ADMIN_LOGIN;
    }

    const passwordMatches = await verifyPassword(input.password, user.password);

    if (!passwordMatches) {
      return INVALID_ADMIN_LOGIN;
    }

    const token = createToken();
    const ttlSeconds = await this.getSessionTtlSeconds('admin');
    const expiresAt = expiresFromNow(ttlSeconds);

    await this.authRepository.createSession({
      userId: user.id,
      token,
      userAgent: getUserAgent(context),
      ip: getIp(context),
      expiresAt,
    });
    await this.sessionStore.set(
      adminSessionKey(token),
      serializeSessionPayload({ userId: user.id, role: 'admin' }),
      'EX',
      ttlSeconds
    );
    setCookie(context, getAdminCookieName(), token, ttlSeconds);

    return {
      success: true,
      data: {
        user: toAuthUserSummary(user),
      },
    };
  }

  async adminLogout(context: TRPCContext): Promise<LogoutResult> {
    const token = getCookieValue(context, getAdminCookieName());

    if (token) {
      await this.deleteSession(token, true);
    }

    clearCookie(context, getAdminCookieName());

    return { success: true };
  }

  async changeAdminPassword(
    input: AdminChangePasswordInput,
    session: AdminSession,
    context: TRPCContext
  ): Promise<PasswordChangeResult> {
    if (input.newPassword.length < 8) {
      throw new AuthServiceError('BAD_REQUEST', 'New password must be at least 8 characters');
    }

    const user = await this.authRepository.findUserById(session.user.id);

    if (!user || user.role !== 'admin' || !user.isActive) {
      throw new AuthServiceError('UNAUTHORIZED', 'Admin session required');
    }

    const passwordMatches = await verifyPassword(input.currentPassword, user.password);

    if (!passwordMatches) {
      throw new AuthServiceError('UNAUTHORIZED', 'Current password is incorrect');
    }

    const updatedUser = await this.authRepository.updateUser(user.id, {
      password: await hashPassword(input.newPassword),
    });

    if (!updatedUser) {
      throw new AuthServiceError('UNAUTHORIZED', 'Admin session required');
    }

    await this.revokeAdminSessions(user.id);
    clearCookie(context, getAdminCookieName());

    return { success: true };
  }

  async userLogout(context: TRPCContext): Promise<LogoutResult> {
    const token = getCookieValue(context, getUserCookieName());

    if (token) {
      await this.deleteSession(token, false);
    }

    clearCookie(context, getUserCookieName());

    return { success: true };
  }

  async getAdminSession(context: TRPCContext): Promise<AdminSessionResult> {
    const session = await this.resolveAdminSession(context);

    if (!session) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: toAuthUserSummary(session.user),
    };
  }

  async resolveUserSession(context: TRPCContext): Promise<UserSession | null> {
    const token = getCookieValue(context, getUserCookieName());

    if (!token) {
      return null;
    }

    return this.resolveSession(token, false, context);
  }

  async resolveAdminSession(context: TRPCContext): Promise<AdminSession | null> {
    const token = getCookieValue(context, getAdminCookieName());

    if (!token) {
      return null;
    }

    return this.resolveSession(token, true, context);
  }

  async getProfile(session: UserSession): Promise<MeProfile> {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  }

  async getPreferences(session: UserSession): Promise<MePreferences> {
    const preferences = await this.authRepository.findUserPreferences(session.user.id);

    return {
      grade: preferences?.grade ?? null,
      subject: preferences?.subject ?? null,
    };
  }

  async getCredits(session: UserSession): Promise<MeCredits> {
    const account = await this.authRepository.findOrCreateCreditAccount(session.user.id);

    return {
      balance: account.balance,
      cycleLimit: account.cycleLimit,
      cycleDays: account.cycleDays,
      resetAt: account.resetAt?.toISOString() ?? null,
    };
  }

  private async resolveSession(
    token: string,
    admin: true,
    context: TRPCContext
  ): Promise<AdminSession | null>;
  private async resolveSession(
    token: string,
    admin: false,
    context: TRPCContext
  ): Promise<UserSession | null>;
  private async resolveSession(
    token: string,
    admin: boolean,
    context: TRPCContext
  ): Promise<AdminSession | UserSession | null> {
    const payload = await this.getSessionPayload(token, admin);

    if (!payload || payload.role !== (admin ? 'admin' : 'user')) {
      return null;
    }

    const [sessionRow, user] = await Promise.all([
      this.authRepository.findSessionByToken(token),
      this.authRepository.findUserById(payload.userId),
    ]);

    if (!sessionRow || sessionRow.expiresAt <= new Date() || !user?.isActive) {
      return null;
    }

    if (admin && user.role !== 'admin') {
      return null;
    }

    if (!admin && user.role !== 'user') {
      return null;
    }

    await this.refreshSessionExpiration(token, admin, user.id, context);

    if (admin) {
      return {
        token,
        user: toAuthenticatedUser(user, 'admin'),
      };
    }

    return {
      token,
      user: toAuthenticatedUser(user, 'user'),
    };
  }

  private async getSessionPayload(token: string, admin: boolean) {
    try {
      const value = await this.sessionStore.get(admin ? adminSessionKey(token) : sessionKey(token));

      return value ? parseSessionPayload(value) : null;
    } catch {
      return null;
    }
  }

  private async refreshSessionExpiration(
    token: string,
    admin: boolean,
    userId: string,
    context: TRPCContext
  ): Promise<void> {
    const ttlSeconds = await this.getSessionTtlSeconds(admin ? 'admin' : 'user');
    const expiresAt = expiresFromNow(ttlSeconds);
    const key = admin ? adminSessionKey(token) : sessionKey(token);
    const role = admin ? 'admin' : 'user';

    await Promise.allSettled([
      this.authRepository.updateSessionExpiration(token, expiresAt),
      this.sessionStore.set(key, serializeSessionPayload({ userId, role }), 'EX', ttlSeconds),
    ]);
    setCookie(context, admin ? getAdminCookieName() : getUserCookieName(), token, ttlSeconds);
  }

  private async getSessionTtlSeconds(role: 'admin' | 'user'): Promise<number> {
    let config: SystemAuthConfigRow | null = null;

    try {
      config = await this.authRepository.getSystemAuthConfig();
    } catch {
      config = null;
    }

    const minutes =
      role === 'admin' ? config?.adminIdleTimeoutMinutes : config?.webIdleTimeoutMinutes;

    return (
      normalizeIdleTimeoutMinutes(
        minutes,
        role === 'admin' ? DEFAULT_ADMIN_IDLE_TIMEOUT_MINUTES : DEFAULT_USER_IDLE_TIMEOUT_MINUTES
      ) * 60
    );
  }

  private async deleteSession(token: string, admin: boolean): Promise<void> {
    await Promise.allSettled([
      this.sessionStore.del(admin ? adminSessionKey(token) : sessionKey(token)),
      this.authRepository.deleteSessionByToken(token),
    ]);
  }

  private async revokeAdminSessions(userId: string): Promise<void> {
    const tokens = await this.authRepository.listSessionTokensByUserId(userId);

    await this.authRepository.deleteSessionsByUserId(userId);
    await Promise.allSettled(tokens.map((token) => this.sessionStore.del(adminSessionKey(token))));
  }

  private async storeWeChatStateBestEffort(state: string): Promise<void> {
    try {
      await this.sessionStore.set(
        `auth:wechat:state:${state}`,
        '1',
        'EX',
        WECHAT_STATE_TTL_SECONDS
      );
    } catch {
      // Local development should still be able to render a mock WeChat login URL without Redis.
    }
  }

  private async consumeWeChatState(state: string): Promise<void> {
    const key = `auth:wechat:state:${state}`;
    let value: string | null;

    try {
      value = await this.sessionStore.get(key);
    } catch {
      throw new AuthServiceError('UNAUTHORIZED', 'Invalid WeChat login state');
    }

    if (!value) {
      throw new AuthServiceError('UNAUTHORIZED', 'Invalid WeChat login state');
    }

    await this.sessionStore.del(key);
  }

  private async exchangeWeChatCode(code: string): Promise<WeChatTokenResponse> {
    const params = new URLSearchParams({
      appid: requireEnv('WECHAT_APP_ID', 'WeChat AppID is not configured'),
      secret: requireEnv('WECHAT_APP_SECRET', 'WeChat AppSecret is not configured'),
      code,
      grant_type: 'authorization_code',
    });
    const response = await this.weChatApiFetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`
    );
    const body = await readWeChatJson<WeChatTokenResponse>(response);

    if (!body.access_token || !body.openid) {
      throw new AuthServiceError('UNAUTHORIZED', 'WeChat authorization failed');
    }

    return body;
  }

  private async fetchWeChatUserInfo(
    accessToken: string,
    openid: string
  ): Promise<WeChatUserInfoResponse> {
    const params = new URLSearchParams({
      access_token: accessToken,
      openid,
      lang: 'zh_CN',
    });
    const response = await this.weChatApiFetch(
      `https://api.weixin.qq.com/sns/userinfo?${params.toString()}`
    );

    return readWeChatJson<WeChatUserInfoResponse>(response);
  }

  private async findOrCreateWeChatUser(
    token: WeChatTokenResponse,
    profile: WeChatUserInfoResponse
  ): Promise<AuthUserRow> {
    const unionid = trimNullableString(profile.unionid ?? token.unionid);
    const openid = requireTrimmed(profile.openid ?? token.openid, 'WeChat openid is required');
    const existingAccount = await this.findWeChatAccount(openid, unionid);

    if (existingAccount) {
      await this.updateWeChatAccountProfile(existingAccount, profile, unionid);
      const existingUser = await this.authRepository.findUserById(existingAccount.userId);

      if (!existingUser || existingUser.role !== 'user' || !existingUser.isActive) {
        throw new AuthServiceError('CONFLICT', 'WeChat account is not bound to an active user');
      }

      return existingUser;
    }

    const nickname = trimNullableString(profile.nickname) ?? '微信用户';
    const user = await this.authRepository.createUser({
      email: `wechat+${sanitizeEmailLocalPart(openid)}@aethercore.local`,
      name: nickname,
      password: await hashPassword(createToken(16)),
      role: 'user',
      isActive: true,
      isBlacklisted: false,
    });

    await this.authRepository.createWeChatAccount({
      userId: user.id,
      openid,
      unionid,
      nickname,
      avatarUrl: trimNullableString(profile.headimgurl),
      rawProfile: profile as Record<string, unknown>,
    });

    return user;
  }

  private async findWeChatAccount(
    openid: string,
    unionid: string | null
  ): Promise<WeChatAccountRow | null> {
    if (unionid) {
      const byUnionid = await this.authRepository.findWeChatAccountByUnionid(unionid);

      if (byUnionid) {
        return byUnionid;
      }
    }

    return this.authRepository.findWeChatAccountByOpenid(openid);
  }

  private async updateWeChatAccountProfile(
    account: WeChatAccountRow,
    profile: WeChatUserInfoResponse,
    unionid: string | null
  ): Promise<void> {
    await this.authRepository.updateWeChatAccount(account.id, {
      avatarUrl: trimNullableString(profile.headimgurl),
      nickname: trimNullableString(profile.nickname),
      rawProfile: profile as Record<string, unknown>,
      unionid,
    });
  }

  private async findOrCreateMockUser(): Promise<AuthUserRow> {
    const email = getMockUserEmail();
    const existingUser = await this.authRepository.findUserByEmail(email);

    if (existingUser) {
      if (existingUser.role !== 'user' || !existingUser.isActive) {
        throw new AuthServiceError('CONFLICT', 'Mock login user is not an active normal user');
      }

      return existingUser;
    }

    return this.authRepository.createUser({
      email,
      name: getMockUserName(),
      password: await hashPassword(createToken(16)),
      role: 'user',
      isActive: true,
      isBlacklisted: false,
    });
  }

  private async createUserLoginSession(
    user: Pick<AuthUserRow, 'email' | 'id' | 'name' | 'username'>,
    context: TRPCContext
  ): Promise<MockLoginResult> {
    const token = createToken();
    const ttlSeconds = await this.getSessionTtlSeconds('user');
    const expiresAt = expiresFromNow(ttlSeconds);

    await this.authRepository.createSession({
      userId: user.id,
      token,
      userAgent: getUserAgent(context),
      ip: getIp(context),
      expiresAt,
    });
    await this.sessionStore.set(
      sessionKey(token),
      serializeSessionPayload({ userId: user.id, role: 'user' }),
      'EX',
      ttlSeconds
    );
    setCookie(context, getUserCookieName(), token, ttlSeconds);

    return {
      success: true,
      data: {
        user: toAuthUserSummary(user),
      },
    };
  }
}

function toAuthUserSummary(
  user: Pick<AuthUserRow, 'id' | 'email' | 'name' | 'username'>
): AuthUserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
  };
}

async function readWeChatJson<TBody>(response: Response): Promise<TBody> {
  if (!response.ok) {
    throw new AuthServiceError('UNAUTHORIZED', 'WeChat authorization failed');
  }

  const body = (await response.json()) as TBody;
  const errorBody = body as WeChatApiErrorResponse;

  if (typeof errorBody.errcode === 'number' && errorBody.errcode !== 0) {
    throw new AuthServiceError('UNAUTHORIZED', errorBody.errmsg || 'WeChat authorization failed');
  }

  return body;
}

function requireEnv(name: string, message: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AuthServiceError('BAD_REQUEST', message);
  }

  return value;
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new AuthServiceError('BAD_REQUEST', message);
  }

  return trimmed;
}

function trimNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function sanitizeEmailLocalPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]/g, '-');
}

function toAuthenticatedUser<TRole extends 'user' | 'admin'>(
  user: AuthUserRow,
  role: TRole
): AuthenticatedUser & { role: TRole } {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    role,
    isBlacklisted: user.isBlacklisted,
  };
}

function createToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

function expiresFromNow(ttlSeconds: number): Date {
  return new Date(Date.now() + ttlSeconds * 1000);
}

function normalizeIdleTimeoutMinutes(value: unknown, fallback: number): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    return fallback;
  }

  return Number(value);
}

function getUserCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || 'aether_session';
}

function getAdminCookieName(): string {
  return process.env.ADMIN_SESSION_COOKIE_NAME || 'aether_admin_session';
}

function getMockUserEmail(): string {
  return process.env.AUTH_MOCK_USER_EMAIL || DEFAULT_MOCK_USER_EMAIL;
}

function getMockUserName(): string {
  return process.env.AUTH_MOCK_USER_NAME || DEFAULT_MOCK_USER_NAME;
}

function isMockLoginEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.AUTH_MOCK_LOGIN_ENABLED === 'true';
  }

  return process.env.AUTH_MOCK_LOGIN_ENABLED !== 'false';
}

function getUserAgent(context: TRPCContext): string | null {
  const userAgent = context.req.headers['user-agent'];

  return Array.isArray(userAgent) ? (userAgent[0] ?? null) : (userAgent ?? null);
}

function getIp(context: TRPCContext): string | null {
  return context.req.ip || null;
}

function getCookieValue(context: TRPCContext, name: string): string | null {
  const cookieHeader = context.req.headers.cookie;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;

  if (!cookies) {
    return null;
  }

  for (const part of cookies.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');

    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join('='));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function setCookie(context: TRPCContext, name: string, value: string, maxAgeSeconds: number): void {
  context.res.header('Set-Cookie', buildCookie(name, value, maxAgeSeconds));
}

function clearCookie(context: TRPCContext, name: string): void {
  context.res.header(
    'Set-Cookie',
    `${buildCookie(name, '', 0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (shouldUseSecureCookies()) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function shouldUseSecureCookies(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase() !== 'false'
  );
}
