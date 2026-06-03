import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import {
  sessions,
  systemAuditLogs,
  userCreditAccounts,
  userPreferences,
  users,
  wechatAccounts,
  type AuditActorType,
} from '@package/db/schema';
import { eq } from 'drizzle-orm';

export type AuthUserRow = typeof users.$inferSelect;
export type AuthUserInsert = typeof users.$inferInsert;
export type AuthSessionRow = typeof sessions.$inferSelect;
export type UserPreferencesRow = typeof userPreferences.$inferSelect;
export type UserCreditAccountRow = typeof userCreditAccounts.$inferSelect;
export type WeChatAccountRow = typeof wechatAccounts.$inferSelect;
export type WeChatAccountInsert = typeof wechatAccounts.$inferInsert;

export type SystemAuditLogSaveData = {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class AuthRepository {
  private readonly database: Database = db;

  async findUserByEmail(email: string): Promise<AuthUserRow | null> {
    const [user] = await this.database.select().from(users).where(eq(users.email, email)).limit(1);

    return user ?? null;
  }

  async findUserByUsername(username: string): Promise<AuthUserRow | null> {
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return user ?? null;
  }

  async findUserById(userId: string): Promise<AuthUserRow | null> {
    const [user] = await this.database.select().from(users).where(eq(users.id, userId)).limit(1);

    return user ?? null;
  }

  async createUser(input: AuthUserInsert): Promise<AuthUserRow> {
    const [user] = await this.database.insert(users).values(input).returning();

    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  async findWeChatAccountByOpenid(openid: string): Promise<WeChatAccountRow | null> {
    const [account] = await this.database
      .select()
      .from(wechatAccounts)
      .where(eq(wechatAccounts.openid, openid))
      .limit(1);

    return account ?? null;
  }

  async findWeChatAccountByUnionid(unionid: string): Promise<WeChatAccountRow | null> {
    const [account] = await this.database
      .select()
      .from(wechatAccounts)
      .where(eq(wechatAccounts.unionid, unionid))
      .limit(1);

    return account ?? null;
  }

  async createWeChatAccount(input: WeChatAccountInsert): Promise<WeChatAccountRow> {
    const [account] = await this.database.insert(wechatAccounts).values(input).returning();

    if (!account) {
      throw new Error('Failed to create WeChat account');
    }

    return account;
  }

  async updateWeChatAccount(
    accountId: string,
    input: Partial<Pick<WeChatAccountRow, 'avatarUrl' | 'nickname' | 'rawProfile' | 'unionid'>>
  ): Promise<WeChatAccountRow | null> {
    const [account] = await this.database
      .update(wechatAccounts)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(wechatAccounts.id, accountId))
      .returning();

    return account ?? null;
  }

  async updateUser(
    userId: string,
    input: Partial<Pick<AuthUserRow, 'email' | 'name' | 'password' | 'role' | 'isActive'>>
  ): Promise<AuthUserRow | null> {
    const [user] = await this.database
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user ?? null;
  }

  async createSession(input: {
    userId: string;
    token: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<void> {
    await this.database.insert(sessions).values(input);
  }

  async findSessionByToken(token: string): Promise<AuthSessionRow | null> {
    const [session] = await this.database
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    return session ?? null;
  }

  async listSessionTokensByUserId(userId: string): Promise<string[]> {
    const rows = await this.database
      .select({ token: sessions.token })
      .from(sessions)
      .where(eq(sessions.userId, userId));

    return rows.map((row) => row.token);
  }

  async deleteSessionByToken(token: string): Promise<void> {
    await this.database.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    await this.database.delete(sessions).where(eq(sessions.userId, userId));
  }

  async createSystemAuditLog(input: SystemAuditLogSaveData): Promise<void> {
    await this.database.insert(systemAuditLogs).values(input);
  }

  async findUserPreferences(userId: string): Promise<UserPreferencesRow | null> {
    const [preferences] = await this.database
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return preferences ?? null;
  }

  async upsertUserPreferences(input: {
    userId: string;
    grade?: string | null;
    subject?: string | null;
  }): Promise<UserPreferencesRow> {
    const [preferences] = await this.database
      .insert(userPreferences)
      .values(input)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          grade: input.grade,
          subject: input.subject,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!preferences) {
      throw new Error('Failed to upsert user preferences');
    }

    return preferences;
  }

  async findOrCreateCreditAccount(userId: string): Promise<UserCreditAccountRow> {
    const existing = await this.findCreditAccount(userId);

    if (existing) {
      return existing;
    }

    await this.database.insert(userCreditAccounts).values({ userId }).onConflictDoNothing();

    const created = await this.findCreditAccount(userId);

    if (!created) {
      throw new Error('Failed to create user credit account');
    }

    return created;
  }

  private async findCreditAccount(userId: string): Promise<UserCreditAccountRow | null> {
    const [account] = await this.database
      .select()
      .from(userCreditAccounts)
      .where(eq(userCreditAccounts.userId, userId))
      .limit(1);

    return account ?? null;
  }
}
