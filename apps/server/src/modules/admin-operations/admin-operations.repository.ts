import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import {
  activities,
  aiConversations,
  aiMessages,
  aiModelCalls,
  alarmConfig,
  contentAuditSessions,
  creditTransactions,
  fissionRewardConfig,
  inviteCodes,
  inviteRelations,
  sessions,
  systemAuthConfig,
  systemAuditLogs,
  userCreditAccounts,
  users,
  type ActivityStatus,
} from '@package/db';
import { and, asc, desc, eq, gte, inArray, isNull, lte, max, sql } from 'drizzle-orm';

export type AdminOperationsUserRow = typeof users.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type ContentAuditSessionRow = typeof contentAuditSessions.$inferSelect;
export type AiMessageRow = typeof aiMessages.$inferSelect;
export type AiModelCallRow = typeof aiModelCalls.$inferSelect;
export type SystemAuditLogRow = typeof systemAuditLogs.$inferSelect;
export type FissionRewardConfigRow = typeof fissionRewardConfig.$inferSelect;
export type AlarmConfigRow = typeof alarmConfig.$inferSelect;
export type SystemAuthConfigRow = typeof systemAuthConfig.$inferSelect;
export type UserCreditAccountRow = typeof userCreditAccounts.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type CreditTransactionRow = typeof creditTransactions.$inferSelect;
export type UserConversationRow = typeof aiConversations.$inferSelect;

export type ActivitySaveData = {
  title: string;
  content: string;
  status: ActivityStatus;
  publishedAt: Date | null;
  createdByAdminId?: string | null;
};

export type ActivityUpdateData = Partial<Omit<ActivitySaveData, 'createdByAdminId'>>;

export type InviteRelationRow = typeof inviteRelations.$inferSelect;
export type InviteCodeRow = typeof inviteCodes.$inferSelect;

export type TrafficStatsRow = {
  engineId: string | null;
  engine: string | null;
  currency: string | null;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  tokensTotal: number;
  avgResponseMs: number;
  costAmount: number;
};

export type LastLoginRow = {
  userId: string;
  lastLoginAt: Date | null;
};

export type DateRangeInput = {
  startDate?: Date;
  endDate?: Date;
};

@Injectable()
export class AdminOperationsRepository {
  private readonly database: Database = db;

  async listUsers(input: { includeDeleted?: boolean } = {}): Promise<AdminOperationsUserRow[]> {
    if (input.includeDeleted) {
      return this.database.select().from(users).orderBy(desc(users.createdAt));
    }

    return this.database
      .select()
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt));
  }

  async findUserById(id: string): Promise<AdminOperationsUserRow | null> {
    const [user] = await this.database
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async findUserByEmail(email: string): Promise<AdminOperationsUserRow | null> {
    const [user] = await this.database.select().from(users).where(eq(users.email, email)).limit(1);

    return user ?? null;
  }

  async findUserByUsername(username: string): Promise<AdminOperationsUserRow | null> {
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return user ?? null;
  }

  async createInvitedUser(input: {
    email: string;
    name: string | null;
    password: string;
    totalQuota: number;
    username: string | null;
  }): Promise<AdminOperationsUserRow> {
    const user = await this.database.transaction(async (transaction) => {
      const [createdUser] = await transaction
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          password: input.password,
          role: 'user',
          username: input.username,
          isActive: true,
          isBlacklisted: false,
        })
        .returning();

      if (!createdUser) {
        throw new Error('Failed to create invited user');
      }

      await transaction.insert(userCreditAccounts).values({
        userId: createdUser.id,
        balance: input.totalQuota,
        cycleLimit: input.totalQuota,
      });

      return createdUser;
    });

    return user;
  }

  async createAdminUser(input: {
    email: string;
    name: string | null;
    password: string;
    username: string;
  }): Promise<AdminOperationsUserRow> {
    const [user] = await this.database
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        password: input.password,
        role: 'admin',
        username: input.username,
        isActive: true,
        isBlacklisted: false,
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create admin user');
    }

    return user;
  }

  async listUserCreditAccounts(userIds: string[]): Promise<UserCreditAccountRow[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.database
      .select()
      .from(userCreditAccounts)
      .where(inArray(userCreditAccounts.userId, userIds));
  }

  async updateUserCreditAccount(input: {
    balance: number;
    cycleLimit: number;
    userId: string;
  }): Promise<UserCreditAccountRow> {
    const [account] = await this.database
      .insert(userCreditAccounts)
      .values({
        balance: input.balance,
        cycleLimit: input.cycleLimit,
        userId: input.userId,
      })
      .onConflictDoUpdate({
        target: userCreditAccounts.userId,
        set: {
          balance: input.balance,
          cycleLimit: input.cycleLimit,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!account) {
      throw new Error('Failed to update user credit account');
    }

    return account;
  }

  async listLastLogins(userIds: string[]): Promise<LastLoginRow[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.database
      .select({
        userId: sessions.userId,
        lastLoginAt: max(sessions.createdAt),
      })
      .from(sessions)
      .where(inArray(sessions.userId, userIds))
      .groupBy(sessions.userId);
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<AdminOperationsUserRow | null> {
    const [user] = await this.database
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    return user ?? null;
  }

  async updateUserBlacklist(
    id: string,
    isBlacklisted: boolean
  ): Promise<AdminOperationsUserRow | null> {
    const [user] = await this.database
      .update(users)
      .set({ isBlacklisted, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    return user ?? null;
  }

  async softDeleteUser(id: string): Promise<AdminOperationsUserRow | null> {
    const [user] = await this.database
      .update(users)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    return user ?? null;
  }

  async listUserSessions(userId: string): Promise<SessionRow[]> {
    return this.database
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));
  }

  async listUserModelCalls(userId: string): Promise<AiModelCallRow[]> {
    return this.database
      .select()
      .from(aiModelCalls)
      .where(eq(aiModelCalls.userId, userId))
      .orderBy(desc(aiModelCalls.createdAt));
  }

  async listUserCreditTransactions(userId: string): Promise<CreditTransactionRow[]> {
    return this.database
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async listUserConversations(userId: string): Promise<UserConversationRow[]> {
    return this.database
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt));
  }

  async listActivities(): Promise<ActivityRow[]> {
    return this.database
      .select()
      .from(activities)
      .where(isNull(activities.deletedAt))
      .orderBy(desc(activities.createdAt));
  }

  async findActivityById(id: string): Promise<ActivityRow | null> {
    const [activity] = await this.database
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), isNull(activities.deletedAt)))
      .limit(1);

    return activity ?? null;
  }

  async createActivity(input: ActivitySaveData): Promise<ActivityRow> {
    const [activity] = await this.database.insert(activities).values(input).returning();

    return activity!;
  }

  async updateActivity(id: string, input: ActivityUpdateData): Promise<ActivityRow | null> {
    const [activity] = await this.database
      .update(activities)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(activities.id, id), isNull(activities.deletedAt)))
      .returning();

    return activity ?? null;
  }

  async softDeleteActivity(id: string): Promise<ActivityRow | null> {
    const [activity] = await this.database
      .update(activities)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(activities.id, id), isNull(activities.deletedAt)))
      .returning();

    return activity ?? null;
  }

  async listInviteRelations(): Promise<InviteRelationRow[]> {
    return this.database.select().from(inviteRelations).orderBy(asc(inviteRelations.createdAt));
  }

  async listInviteCodes(): Promise<InviteCodeRow[]> {
    return this.database.select().from(inviteCodes);
  }

  async getFissionRewardConfig(): Promise<FissionRewardConfigRow | null> {
    const [config] = await this.database.select().from(fissionRewardConfig).limit(1);

    return config ?? null;
  }

  async updateFissionRewardConfig(input: {
    inviterQuota: number;
    inviteeQuota: number;
    enableMultiTier: boolean;
    tier2RewardPct: number;
    isActive: boolean;
    updatedByAdminId: string | null;
  }): Promise<FissionRewardConfigRow> {
    const [config] = await this.database
      .insert(fissionRewardConfig)
      .values({ id: 'default', ...input })
      .onConflictDoUpdate({
        target: fissionRewardConfig.id,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();

    return config!;
  }

  async getAlarmConfig(): Promise<AlarmConfigRow | null> {
    const [config] = await this.database.select().from(alarmConfig).limit(1);

    return config ?? null;
  }

  async updateAlarmConfig(input: {
    costThresholdAmount: number;
    currency: string;
    email: string;
    updatedByAdminId: string | null;
  }): Promise<AlarmConfigRow> {
    const [config] = await this.database
      .insert(alarmConfig)
      .values({ id: 'default', ...input })
      .onConflictDoUpdate({
        target: alarmConfig.id,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();

    return config!;
  }

  async getSystemConfig(): Promise<SystemAuthConfigRow | null> {
    const [config] = await this.database.select().from(systemAuthConfig).limit(1);

    return config ?? null;
  }

  async updateSystemConfig(input: {
    adminIdleTimeoutMinutes: number;
    auditLogRetentionDays: number;
    webIdleTimeoutMinutes: number;
    updatedByAdminId: string | null;
  }): Promise<SystemAuthConfigRow> {
    const [config] = await this.database
      .insert(systemAuthConfig)
      .values({ id: 'default', ...input })
      .onConflictDoUpdate({
        target: systemAuthConfig.id,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();

    return config!;
  }

  async listSystemAuditLogs(range: DateRangeInput = {}): Promise<SystemAuditLogRow[]> {
    const startTimestamp =
      range.startDate === undefined ? undefined : Math.floor(range.startDate.getTime() / 1000);
    const endTimestamp =
      range.endDate === undefined ? undefined : Math.floor(range.endDate.getTime() / 1000);

    return this.database
      .select()
      .from(systemAuditLogs)
      .where(
        and(
          startTimestamp === undefined ? undefined : gte(systemAuditLogs.timestamp, startTimestamp),
          endTimestamp === undefined ? undefined : lte(systemAuditLogs.timestamp, endTimestamp)
        )
      )
      .orderBy(desc(systemAuditLogs.timestamp));
  }

  async deleteSystemAuditLogsByTimestampRange(input: {
    endTimestamp: number;
    startTimestamp: number;
  }): Promise<number> {
    const rows = await this.database
      .delete(systemAuditLogs)
      .where(
        and(
          gte(systemAuditLogs.timestamp, input.startTimestamp),
          lte(systemAuditLogs.timestamp, input.endTimestamp)
        )
      )
      .returning({ logId: systemAuditLogs.logId });

    return rows.length;
  }

  async deleteSystemAuditLogsBefore(timestamp: number): Promise<number> {
    const rows = await this.database
      .delete(systemAuditLogs)
      .where(lte(systemAuditLogs.timestamp, timestamp))
      .returning({ logId: systemAuditLogs.logId });

    return rows.length;
  }

  async listContentAuditSessions(range: DateRangeInput = {}): Promise<ContentAuditSessionRow[]> {
    return this.database
      .select()
      .from(contentAuditSessions)
      .where(dateRangeWhere(contentAuditSessions.createdAt, range))
      .orderBy(desc(contentAuditSessions.updatedAt));
  }

  async listContentAuditMessages(conversationId: string): Promise<AiMessageRow[]> {
    return this.database
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(asc(aiMessages.messageOrder));
  }

  async findContentAuditSessionById(id: string): Promise<ContentAuditSessionRow | null> {
    const [session] = await this.database
      .select()
      .from(contentAuditSessions)
      .where(eq(contentAuditSessions.id, id))
      .limit(1);

    return session ?? null;
  }

  async softDeleteContentAuditSession(id: string): Promise<ContentAuditSessionRow | null> {
    return this.database.transaction(async (transaction) => {
      const [session] = await transaction
        .update(contentAuditSessions)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(contentAuditSessions.id, id), eq(contentAuditSessions.isDeleted, false)))
        .returning();

      if (!session) {
        return null;
      }

      await transaction
        .update(aiConversations)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(aiConversations.id, session.conversationId));

      return session;
    });
  }

  async listTrafficStats(range: DateRangeInput = {}): Promise<TrafficStatsRow[]> {
    return this.database
      .select({
        engineId: aiModelCalls.engineId,
        engine: aiModelCalls.modelName,
        currency: aiModelCalls.currency,
        totalCalls: sql<number>`count(*)::int`,
        successCalls: sql<number>`count(*) filter (where ${aiModelCalls.status} = 'success')::int`,
        failedCalls: sql<number>`count(*) filter (where ${aiModelCalls.status} = 'failed')::int`,
        tokensTotal: sql<number>`coalesce(sum(${aiModelCalls.totalTokens}), 0)::int`,
        avgResponseMs: sql<number>`coalesce(avg(${aiModelCalls.latencyMs}), 0)::float`,
        costAmount: sql<number>`coalesce(sum(${aiModelCalls.costAmount}), 0)::float`,
      })
      .from(aiModelCalls)
      .where(dateRangeWhere(aiModelCalls.createdAt, range))
      .groupBy(aiModelCalls.engineId, aiModelCalls.modelName, aiModelCalls.currency)
      .orderBy(sql`coalesce(sum(${aiModelCalls.totalTokens}), 0) desc`);
  }
}

function dateRangeWhere(
  column: Parameters<typeof gte>[0],
  range: DateRangeInput
): ReturnType<typeof and> {
  return and(
    range.startDate ? gte(column, range.startDate) : undefined,
    range.endDate ? lte(column, range.endDate) : undefined
  );
}
