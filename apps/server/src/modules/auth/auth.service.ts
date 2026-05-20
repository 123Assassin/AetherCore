import { Injectable } from '@nestjs/common';
import {
  adminSessionKey,
  parseSessionPayload,
  redis,
  serializeSessionPayload,
  sessionKey,
  verifyPassword,
} from '@package/auth';
import { randomBytes } from 'node:crypto';

import type { TRPCContext } from '../../trpc/context.js';
import { AuthRepository, type AuthUserRow } from './auth.repository.js';

const ADMIN_SESSION_TTL_SECONDS = 2 * 60 * 60;
const WECHAT_STATE_TTL_SECONDS = 10 * 60;

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
  role: 'user' | 'admin';
  isBlacklisted: boolean;
};

type AuthUserSummary = {
  id: string;
  email: string;
  name: string | null;
};

type AdminLoginInput = {
  username: string;
  password: string;
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

type WeChatLoginUrlResult = {
  url: string;
  state: string;
  expiresInSeconds: number;
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

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async getWeChatLoginUrl(): Promise<WeChatLoginUrlResult> {
    const state = createToken(16);
    const appId = process.env.WECHAT_APP_ID || 'mock-wechat-app';
    const redirectUri =
      process.env.WECHAT_REDIRECT_URI || 'http://localhost:3001/auth/wechat/callback';
    const params = new URLSearchParams({
      appid: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    });

    await this.storeWeChatStateBestEffort(state);

    return {
      url: `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`,
      state,
      expiresInSeconds: WECHAT_STATE_TTL_SECONDS,
    };
  }

  async adminLogin(input: AdminLoginInput, context: TRPCContext): Promise<AdminLoginResult> {
    const user = await this.authRepository.findUserByEmail(input.username);

    if (!user || user.role !== 'admin' || !user.isActive) {
      return INVALID_ADMIN_LOGIN;
    }

    const passwordMatches = await verifyPassword(input.password, user.password);

    if (!passwordMatches) {
      return INVALID_ADMIN_LOGIN;
    }

    const token = createToken();
    const expiresAt = expiresFromNow(ADMIN_SESSION_TTL_SECONDS);

    await this.authRepository.createSession({
      userId: user.id,
      token,
      userAgent: getUserAgent(context),
      ip: getIp(context),
      expiresAt,
    });
    await redis.set(
      adminSessionKey(token),
      serializeSessionPayload({ userId: user.id, role: 'admin' }),
      'EX',
      ADMIN_SESSION_TTL_SECONDS
    );
    setCookie(context, getAdminCookieName(), token, ADMIN_SESSION_TTL_SECONDS);

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

    return this.resolveSession(token, false);
  }

  async resolveAdminSession(context: TRPCContext): Promise<AdminSession | null> {
    const token = getCookieValue(context, getAdminCookieName());

    if (!token) {
      return null;
    }

    return this.resolveSession(token, true);
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

  private async resolveSession(token: string, admin: true): Promise<AdminSession | null>;
  private async resolveSession(token: string, admin: false): Promise<UserSession | null>;
  private async resolveSession(
    token: string,
    admin: boolean
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
      const value = await redis.get(admin ? adminSessionKey(token) : sessionKey(token));

      return value ? parseSessionPayload(value) : null;
    } catch {
      return null;
    }
  }

  private async deleteSession(token: string, admin: boolean): Promise<void> {
    await Promise.allSettled([
      redis.del(admin ? adminSessionKey(token) : sessionKey(token)),
      this.authRepository.deleteSessionByToken(token),
    ]);
  }

  private async storeWeChatStateBestEffort(state: string): Promise<void> {
    try {
      await redis.set(`auth:wechat:state:${state}`, '1', 'EX', WECHAT_STATE_TTL_SECONDS);
    } catch {
      // Local development should still be able to render a mock WeChat login URL without Redis.
    }
  }
}

function toAuthUserSummary(user: Pick<AuthUserRow, 'id' | 'email' | 'name'>): AuthUserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function toAuthenticatedUser<TRole extends 'user' | 'admin'>(
  user: AuthUserRow,
  role: TRole
): AuthenticatedUser & { role: TRole } {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
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

function getUserCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || 'aether_session';
}

function getAdminCookieName(): string {
  return process.env.ADMIN_SESSION_COOKIE_NAME || 'aether_admin_session';
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

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}
