import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AdminOperationsService,
  type AdminOperationsAuditContext,
} from './admin-operations.service.js';
import type {
  AiMessageRow,
  AiModelCallRow,
  AdminOperationsRepository,
  AdminOperationsUserRow,
  ContentAuditSessionRow,
  CreditTransactionRow,
  LastLoginRow,
  SessionRow,
  SystemAuditLogRow,
  TrafficStatsRow,
  UserConversationRow,
  UserCreditAccountRow,
} from './admin-operations.repository.js';

const now = new Date('2026-05-20T00:00:00.000Z');
const actor = {
  actorId: 'admin-1',
  ip: '127.0.0.1',
  userAgent: 'node-test',
} satisfies AdminOperationsAuditContext;

test('user status and blacklist mutate independently', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const disabled = await service.updateUserStatus({ id: 'user-1', status: 'disabled' }, actor);

  assert.equal(disabled.status, 'disabled');
  assert.equal(disabled.isBlacklisted, false);

  const blacklisted = await service.updateUserBlacklist(
    { id: 'user-1', isBlacklisted: true },
    actor
  );

  assert.equal(blacklisted.status, 'disabled');
  assert.equal(blacklisted.isBlacklisted, true);
  assert.equal(repository.users[0]?.isActive, false);
  assert.equal(repository.users[0]?.isBlacklisted, true);
});

test('content audit delete sets soft-delete marker', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const deleted = await service.deleteContentAuditSession({ id: 'content-1' }, actor);

  assert.equal(deleted.id, 'content-1');
  assert.equal(deleted.isDeleted, true);
  assert.equal(repository.contentAuditSessions[0]?.isDeleted, true);
});

test('high-risk mutations no longer write service-level system audit logs', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  await service.updateUserBlacklist({ id: 'user-1', isBlacklisted: true }, actor);
  await service.deleteContentAuditSession({ id: 'content-1' }, actor);

  assert.equal(repository.auditWriteCalls, 0);
});

test('content audit delete maps a concurrent soft delete to conflict', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());
  repository.markContentAuditDeletedDuringSoftDelete = true;

  await assert.rejects(
    () => service.deleteContentAuditSession({ id: 'content-1' }, actor),
    (error) =>
      error instanceof Error &&
      'domainCode' in error &&
      error.domainCode === 'RESOURCE_ALREADY_DELETED'
  );
});

test('admin mutation succeeds without service-level audit dependency', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const blacklisted = await service.updateUserBlacklist(
    { id: 'user-1', isBlacklisted: true },
    actor
  );

  assert.equal(blacklisted.isBlacklisted, true);
  assert.equal(repository.users[0]?.isBlacklisted, true);
  assert.equal(repository.auditWriteCalls, 0);
});

test('user list exposes documented status quota and last login fields', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());
  repository.users.push({
    ...repository.users[0]!,
    id: 'deleted-user',
    email: 'deleted@example.com',
    isActive: false,
    deletedAt: now,
  });

  const result = await service.listUsers({ status: 'deleted' });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'deleted-user');
  assert.equal(result.items[0]?.status, 'deleted');
  assert.equal(result.items[0]?.credits, 25);
  assert.equal(result.items[0]?.totalQuota, 50);
  assert.equal(result.items[0]?.lastLoginAt, now.toISOString());
});

test('user list excludes system administrators by default and supports admin role filtering', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());
  repository.users.push({
    ...repository.users[0]!,
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    username: 'admin',
  });

  const webUsers = await service.listUsers();
  const adminUsers = await service.listUsers({ role: 'admin' });

  assert.deepEqual(
    webUsers.items.map((item) => item.id),
    ['user-1']
  );
  assert.deepEqual(
    adminUsers.items.map((item) => item.id),
    ['admin-1']
  );
});

test('invite user accepts totalQuota and stores a hashed placeholder password', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const invited = await service.inviteUser(
    { email: 'invitee@example.com', name: 'Invitee', totalQuota: 200 },
    actor
  );

  assert.equal(repository.lastInvitedUserInput?.totalQuota, 200);
  assert.equal(repository.lastInvitedUserInput?.password.startsWith('invited:'), false);
  assert.equal(invited.credits, 200);
  assert.equal(invited.totalQuota, 200);
});

test('invite user accepts username and password for web account creation', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const invited = await service.inviteUser(
    {
      email: 'teacher@example.com',
      name: 'Teacher',
      password: 'secret123',
      totalQuota: 80,
      username: 'teacher',
    },
    actor
  );

  assert.equal(repository.lastInvitedUserInput?.username, 'teacher');
  assert.equal(repository.lastInvitedUserInput?.password.startsWith('secret123'), false);
  assert.equal(invited.role, 'user');
  assert.equal(invited.credits, 80);
  assert.equal(invited.totalQuota, 80);
});

test('create admin user stores admin role with username and hashed password', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const admin = await service.createAdminUser(
    {
      email: 'new-admin@example.com',
      name: 'New Admin',
      password: 'admin123',
      username: 'new-admin',
    },
    actor
  );

  assert.equal(repository.lastCreatedAdminInput?.username, 'new-admin');
  assert.equal(repository.lastCreatedAdminInput?.password.startsWith('admin123'), false);
  assert.equal(admin.role, 'admin');
  assert.equal(admin.displayName, 'New Admin');
});

test('update user quota upserts account without service-level audit writes', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const updated = await service.updateUserQuota(
    { credits: 30, id: 'user-1', totalQuota: 60 },
    actor
  );

  assert.equal(updated.credits, 30);
  assert.equal(updated.totalQuota, 60);
  assert.equal(repository.creditAccounts[0]?.balance, 30);
  assert.equal(repository.creditAccounts[0]?.cycleLimit, 60);
  assert.equal(repository.auditWriteCalls, 0);
});

test('system config returns default admin and web idle timeout values', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const config = await service.getSystemConfig();

  assert.equal(config.adminIdleTimeoutMinutes, 120);
  assert.equal(config.webIdleTimeoutMinutes, 10080);
  assert.equal(config.auditLogRetentionDays, 180);
  assert.equal(config.updatedByAdminId, null);
  assert.equal(config.updatedAt, null);
});

test('update system config persists login idle timeout values without service-level audit writes', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const config = await service.updateSystemConfig(
    {
      adminIdleTimeoutMinutes: 30,
      auditLogRetentionDays: 90,
      webIdleTimeoutMinutes: 1440,
    },
    actor
  );

  assert.equal(config.adminIdleTimeoutMinutes, 30);
  assert.equal(config.auditLogRetentionDays, 90);
  assert.equal(config.webIdleTimeoutMinutes, 1440);
  assert.equal(repository.systemConfig?.updatedByAdminId, actor.actorId);
  assert.equal(repository.auditWriteCalls, 0);
});

test('manual system audit cleanup deletes logs in selected timestamp range', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const result = await service.cleanupSystemAuditLogsByDateRange(
    {
      startDate: '2026-05-19T23:59:59.000Z',
      endDate: '2026-05-20T00:00:00.000Z',
    },
    actor
  );

  assert.equal(result.deletedCount, 2);
  assert.deepEqual(
    repository.systemAuditLogs.map((item) => item.logId),
    []
  );
});

test('auto system audit cleanup deletes logs older than configured retention days', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());
  repository.systemConfig = {
    adminIdleTimeoutMinutes: 120,
    auditLogRetentionDays: 7,
    webIdleTimeoutMinutes: 10080,
    updatedByAdminId: actor.actorId,
    updatedAt: now,
  };
  repository.systemAuditLogs.push({
    logId: 'audit-old',
    timestamp: 1778630399,
    level: 1,
    details: { module: '系统审计日志' },
    logType: 10,
  });

  const result = await withNow(now, () => service.cleanupSystemAuditLogsByRetention(actor));

  assert.equal(result.deletedCount, 1);
  assert.equal(result.cutoffTimestamp, 1778630400);
  assert.deepEqual(
    repository.systemAuditLogs.map((item) => item.logId),
    ['audit-1', 'audit-2']
  );
});

test('system audit list returns new audit log model with level logType and details filters', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const result = await service.listSystemAuditLogs({ level: 0, logType: 1, q: 'quota' });

  assert.deepEqual(result.items, [
    {
      logId: 'audit-1',
      timestamp: 1779235200,
      level: 0,
      details: {
        actorId: 'admin-1',
        apiRoute: 'users.quota',
        module: '用户管理',
      },
      logType: 1,
    },
  ]);
});

test('user activity combines login ai credit and conversation activity', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const result = await service.listUserActivity({ userId: 'user-1' });

  assert.deepEqual(result.items.map((item) => item.type).sort(), [
    'ai_call',
    'conversation',
    'credit',
    'login',
  ]);
});

test('content audit supports user filtering and returns messages for detail', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const filtered = await service.listContentAuditSessions({ userId: 'missing-user' });
  const detail = await service.getContentAuditSession({ id: 'content-1' });

  assert.equal(filtered.total, 0);
  assert.equal(detail.messages.length, 2);
  assert.equal(detail.messages[0]?.role, 'user');
  assert.equal(detail.messages[1]?.role, 'assistant');
});

test('traffic stats use documented engine metrics contract', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const [item] = await service.listTrafficStats();

  assert.equal(item?.engine, 'Mock AI');
  assert.equal(item?.tokensTotal, 120);
  assert.equal(item?.avgResponseMs, 80);
  assert.equal(item?.successRate, 0.75);
  assert.equal(item?.costAmount, 1.25);
});

class FakeAdminOperationsRepository {
  auditWriteCalls = 0;
  markContentAuditDeletedDuringSoftDelete = false;
  lastInvitedUserInput: {
    email: string;
    name: string | null;
    password: string;
    totalQuota: number;
    username: string | null;
  } | null = null;
  lastCreatedAdminInput: {
    email: string;
    name: string | null;
    password: string;
    username: string;
  } | null = null;
  systemConfig: {
    adminIdleTimeoutMinutes: number;
    auditLogRetentionDays: number;
    webIdleTimeoutMinutes: number;
    updatedByAdminId: string | null;
    updatedAt: Date;
  } | null = null;

  readonly users: AdminOperationsUserRow[] = [
    {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      password: 'hash',
      role: 'user',
      username: null,
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  readonly contentAuditSessions: ContentAuditSessionRow[] = [
    {
      id: 'content-1',
      conversationId: 'conversation-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
      category: 'chat',
      title: 'Conversation',
      messageCount: 2,
      lastMessageAt: now,
      metadata: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  readonly creditAccounts: UserCreditAccountRow[] = [
    {
      userId: 'user-1',
      balance: 10,
      cycleLimit: 100,
      cycleDays: 180,
      resetAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'deleted-user',
      balance: 25,
      cycleLimit: 50,
      cycleDays: 180,
      resetAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  readonly sessions: SessionRow[] = [
    {
      id: 'session-1',
      userId: 'user-1',
      token: 'token-1',
      userAgent: 'node-test',
      ip: '127.0.0.1',
      expiresAt: new Date('2026-05-21T00:00:00.000Z'),
      createdAt: now,
    },
    {
      id: 'session-deleted',
      userId: 'deleted-user',
      token: 'token-deleted',
      userAgent: 'node-test',
      ip: '127.0.0.2',
      expiresAt: new Date('2026-05-21T00:00:00.000Z'),
      createdAt: now,
    },
  ];

  readonly modelCalls: AiModelCallRow[] = [
    {
      id: 'call-1',
      conversationId: 'conversation-1',
      messageId: 'message-2',
      userId: 'user-1',
      agentId: null,
      engineId: null,
      modelName: 'Mock AI',
      promptTokens: 40,
      completionTokens: 80,
      totalTokens: 120,
      latencyMs: 80,
      costAmount: 1.25,
      currency: 'CNY',
      status: 'success',
      errorCode: null,
      errorMessage: null,
      createdAt: now,
    },
  ];

  readonly creditTransactions: CreditTransactionRow[] = [
    {
      id: 'credit-1',
      userId: 'user-1',
      direction: 'out',
      amount: 1,
      reason: 'chat',
      idempotencyKey: null,
      relatedType: 'ai_conversation',
      relatedId: 'conversation-1',
      balanceAfter: 9,
      createdByAdminId: null,
      createdAt: now,
    },
  ];

  readonly conversations: UserConversationRow[] = [
    {
      id: 'conversation-1',
      userId: 'user-1',
      category: 'chat',
      title: 'Conversation',
      metadata: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  systemAuditLogs: SystemAuditLogRow[] = [
    {
      logId: 'audit-1',
      timestamp: 1779235200,
      level: 0,
      details: {
        actorId: 'admin-1',
        apiRoute: 'users.quota',
        module: '用户管理',
      },
      logType: 1,
    },
    {
      logId: 'audit-2',
      timestamp: 1779235199,
      level: 1,
      details: {
        actorId: 'admin-1',
        apiRoute: 'systemAudit.list',
        module: '系统审计日志',
      },
      logType: 10,
    },
  ];

  readonly messages: AiMessageRow[] = [
    {
      id: 'message-1',
      messageOrder: 1n,
      conversationId: 'conversation-1',
      role: 'user',
      content: 'hello',
      payload: null,
      suggestions: null,
      workflowName: null,
      redirectTo: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'message-2',
      messageOrder: 2n,
      conversationId: 'conversation-1',
      role: 'assistant',
      content: 'hi',
      payload: null,
      suggestions: null,
      workflowName: null,
      redirectTo: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  readonly trafficStats: TrafficStatsRow[] = [
    {
      engineId: null,
      engine: 'Mock AI',
      currency: 'CNY',
      totalCalls: 4,
      successCalls: 3,
      failedCalls: 1,
      tokensTotal: 120,
      avgResponseMs: 80,
      costAmount: 1.25,
    },
  ];

  asRepository(): AdminOperationsRepository {
    return this as unknown as AdminOperationsRepository;
  }

  async listUsers(input: { includeDeleted?: boolean } = {}): Promise<AdminOperationsUserRow[]> {
    return input.includeDeleted ? this.users : this.users.filter((item) => !item.deletedAt);
  }

  async listUserCreditAccounts(userIds: string[]): Promise<UserCreditAccountRow[]> {
    return this.creditAccounts.filter((item) => userIds.includes(item.userId));
  }

  async listLastLogins(userIds: string[]): Promise<LastLoginRow[]> {
    return this.sessions
      .filter((item) => userIds.includes(item.userId))
      .map((item) => ({ userId: item.userId, lastLoginAt: item.createdAt }));
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<AdminOperationsUserRow | null> {
    const user = this.users.find((item) => item.id === id && !item.deletedAt);

    if (!user) {
      return null;
    }

    user.isActive = isActive;
    user.updatedAt = now;

    return user;
  }

  async updateUserBlacklist(
    id: string,
    isBlacklisted: boolean
  ): Promise<AdminOperationsUserRow | null> {
    const user = this.users.find((item) => item.id === id && !item.deletedAt);

    if (!user) {
      return null;
    }

    user.isBlacklisted = isBlacklisted;
    user.updatedAt = now;

    return user;
  }

  async findUserByEmail(email: string): Promise<AdminOperationsUserRow | null> {
    return this.users.find((item) => item.email === email) ?? null;
  }

  async findUserByUsername(username: string): Promise<AdminOperationsUserRow | null> {
    return this.users.find((item) => item.username === username) ?? null;
  }

  async createInvitedUser(input: {
    email: string;
    name: string | null;
    password: string;
    totalQuota: number;
    username: string | null;
  }): Promise<AdminOperationsUserRow> {
    this.lastInvitedUserInput = input;
    const user: AdminOperationsUserRow = {
      id: 'invited-user',
      email: input.email,
      name: input.name,
      password: input.password,
      role: 'user',
      username: input.username,
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.users.push(user);

    return user;
  }

  async createAdminUser(input: {
    email: string;
    name: string | null;
    password: string;
    username: string;
  }): Promise<AdminOperationsUserRow> {
    this.lastCreatedAdminInput = input;
    const user: AdminOperationsUserRow = {
      id: 'created-admin',
      email: input.email,
      name: input.name,
      password: input.password,
      role: 'admin',
      username: input.username,
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.users.push(user);

    return user;
  }

  async updateUserCreditAccount(input: {
    balance: number;
    cycleLimit: number;
    userId: string;
  }): Promise<UserCreditAccountRow> {
    const existing = this.creditAccounts.find((item) => item.userId === input.userId);

    if (existing) {
      existing.balance = input.balance;
      existing.cycleLimit = input.cycleLimit;
      existing.updatedAt = now;

      return existing;
    }

    const account: UserCreditAccountRow = {
      userId: input.userId,
      balance: input.balance,
      cycleLimit: input.cycleLimit,
      cycleDays: 180,
      resetAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.creditAccounts.push(account);

    return account;
  }

  async getSystemConfig() {
    return this.systemConfig;
  }

  async updateSystemConfig(input: {
    adminIdleTimeoutMinutes: number;
    auditLogRetentionDays: number;
    webIdleTimeoutMinutes: number;
    updatedByAdminId: string | null;
  }) {
    this.systemConfig = {
      ...input,
      updatedAt: now,
    };

    return this.systemConfig;
  }

  async findUserById(id: string): Promise<AdminOperationsUserRow | null> {
    return this.users.find((item) => item.id === id && !item.deletedAt) ?? null;
  }

  async listUserSessions(userId: string): Promise<SessionRow[]> {
    return this.sessions.filter((item) => item.userId === userId);
  }

  async listUserModelCalls(userId: string): Promise<AiModelCallRow[]> {
    return this.modelCalls.filter((item) => item.userId === userId);
  }

  async listUserCreditTransactions(userId: string): Promise<CreditTransactionRow[]> {
    return this.creditTransactions.filter((item) => item.userId === userId);
  }

  async listUserConversations(userId: string): Promise<UserConversationRow[]> {
    return this.conversations.filter((item) => item.userId === userId);
  }

  async softDeleteContentAuditSession(id: string): Promise<ContentAuditSessionRow | null> {
    const session = this.contentAuditSessions.find((item) => item.id === id);

    if (!session) {
      return null;
    }
    if (this.markContentAuditDeletedDuringSoftDelete) {
      session.isDeleted = true;
      session.updatedAt = now;

      return null;
    }

    session.isDeleted = true;
    session.updatedAt = now;

    return session;
  }

  async findContentAuditSessionById(id: string): Promise<ContentAuditSessionRow | null> {
    return this.contentAuditSessions.find((item) => item.id === id) ?? null;
  }

  async listContentAuditSessions(): Promise<ContentAuditSessionRow[]> {
    return this.contentAuditSessions;
  }

  async listContentAuditMessages(conversationId: string): Promise<AiMessageRow[]> {
    return this.messages.filter((item) => item.conversationId === conversationId);
  }

  async listTrafficStats(): Promise<TrafficStatsRow[]> {
    return this.trafficStats;
  }

  async listSystemAuditLogs(): Promise<SystemAuditLogRow[]> {
    return this.systemAuditLogs;
  }

  async deleteSystemAuditLogsByTimestampRange(input: {
    endTimestamp: number;
    startTimestamp: number;
  }): Promise<number> {
    const before = this.systemAuditLogs.length;
    this.systemAuditLogs = this.systemAuditLogs.filter(
      (item) => item.timestamp < input.startTimestamp || item.timestamp > input.endTimestamp
    );

    return before - this.systemAuditLogs.length;
  }

  async deleteSystemAuditLogsBefore(timestamp: number): Promise<number> {
    const before = this.systemAuditLogs.length;
    this.systemAuditLogs = this.systemAuditLogs.filter((item) => item.timestamp > timestamp);

    return before - this.systemAuditLogs.length;
  }

  async createSystemAuditLog(): Promise<void> {
    this.auditWriteCalls += 1;
  }
}

async function withNow<T>(date: Date, callback: () => Promise<T>): Promise<T> {
  const originalDateNow = Date.now;

  Date.now = () => date.getTime();

  try {
    return await callback();
  } finally {
    Date.now = originalDateNow;
  }
}
